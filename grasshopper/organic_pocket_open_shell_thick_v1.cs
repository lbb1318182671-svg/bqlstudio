// Grasshopper Script Instance
// Organic precast planter pocket study - open shell with thickness
//
// Rhino units: feet
//
// Inputs:
// W double                  // overall facade study width, e.g. 18
// FloorH double             // floor-to-floor height, e.g. 12
// Levels int                // e.g. 3
// PlantersPerLevel int      // e.g. 4
// PlanterScale double       // e.g. 1.0
// Organic double            // 0 to 1, e.g. 0.75
// WallT double              // shell thickness in feet, e.g. 0.18
// Seed int                  // e.g. 7
//
// Outputs:
// PocketShells              // Generic / No Type Hint
// PocketSoils               // Generic / No Type Hint
// PocketRims                // Generic / No Type Hint
// BackPlates                // Generic / No Type Hint
// DrainHoles                // Generic / No Type Hint
// DebugProfiles             // Generic / No Type Hint

#region Usings
using System;
using System.Linq;
using System.Collections;
using System.Collections.Generic;
using System.Drawing;

using Rhino;
using Rhino.Geometry;

using Grasshopper;
using Grasshopper.Kernel;
using Grasshopper.Kernel.Data;
using Grasshopper.Kernel.Types;
#endregion

public class Script_Instance : GH_ScriptInstance
{
  private void RunScript(
    double W,
    double FloorH,
    int Levels,
    int PlantersPerLevel,
    double PlanterScale,
    double Organic,
    double WallT,
    int Seed,
    ref object PocketShells,
    ref object PocketSoils,
    ref object PocketRims,
    ref object BackPlates,
    ref object DrainHoles,
    ref object DebugProfiles)
  {
    W = Math.Max(W, 8.0);
    FloorH = Math.Max(FloorH, 8.0);
    Levels = Math.Max(Levels, 1);
    PlantersPerLevel = Math.Max(PlantersPerLevel, 1);
    PlanterScale = Math.Max(PlanterScale, 0.35);
    Organic = Clamp(Organic, 0.0, 1.0);
    WallT = Clamp(WallT, 0.06, 0.45);

    var shells = new List<object>();
    var soils = new List<object>();
    var rims = new List<object>();
    var backs = new List<object>();
    var drains = new List<object>();
    var debug = new List<object>();

    var random = new Random(Seed);

    double bayStep = W / PlantersPerLevel;
    double facadeY = 0.0;

    for (int level = 0; level < Levels; level++)
    {
      for (int j = 0; j < PlantersPerLevel; j++)
      {
        double uBay = PlantersPerLevel == 1 ? 0.5 : (double)j / (PlantersPerLevel - 1);
        double vLevel = Levels == 1 ? 0.5 : (double)level / (Levels - 1);

        // Organic size field: deliberate variation, but still controlled by facade bays.
        double centerBias = 0.86 + 0.20 * Math.Sin((uBay + 0.15) * Math.PI);
        double heightBias = 0.82 + 0.26 * Math.Sin((vLevel + 0.10) * Math.PI);
        double waveBias = 1.0 + 0.16 * Math.Sin(j * 1.9 + level * 0.85 + Seed * 0.13);
        double noiseBias = 1.0 + (random.NextDouble() - 0.5) * 0.26 * Organic;
        double scale = PlanterScale * centerBias * heightBias * waveBias * noiseBias;

        double x = -W * 0.5 + bayStep * (j + 0.5);
        x += (random.NextDouble() - 0.5) * bayStep * 0.28 * Organic;

        double z = level * FloorH + FloorH * (0.50 + 0.08 * Math.Sin(j * 1.2 + level * 0.65 + Seed * 0.2));
        z += (random.NextDouble() - 0.5) * FloorH * 0.10 * Organic;

        double width = bayStep * (0.74 + 0.14 * Organic) * scale;
        double height = FloorH * (0.30 + 0.08 * Organic) * scale;
        double depth = (1.65 + 0.55 * Organic) * scale;

        var data = MakePocketShell(
          new Point3d(x, facadeY, z),
          width,
          height,
          depth,
          WallT,
          Organic,
          Seed + level * 101 + j * 37);

        shells.Add(data.Shell);
        soils.Add(data.Soil);
        rims.Add(data.OuterRim);
        rims.Add(data.InnerRim);
        backs.Add(BoxBrep(
          new Point3d(x - width * 0.43, facadeY - 0.08, z - height * 0.36),
          new Point3d(x + width * 0.43, facadeY + 0.04, z + height * 0.40)));

        foreach (Curve c in data.DrainCurves) drains.Add(c);
        foreach (Curve c in data.DebugCurves) debug.Add(c);
      }
    }

    Print("Generated " + shells.Count + " thick open pocket shells. Facade plane is Y=0; pocket depth projects toward negative Y.");

    PocketShells = shells;
    PocketSoils = soils;
    PocketRims = rims;
    BackPlates = backs;
    DrainHoles = drains;
    DebugProfiles = debug;
  }

  class PocketData
  {
    public Mesh Shell;
    public Mesh Soil;
    public Curve OuterRim;
    public Curve InnerRim;
    public List<Curve> DrainCurves = new List<Curve>();
    public List<Curve> DebugCurves = new List<Curve>();
  }

  PocketData MakePocketShell(Point3d c, double width, double height, double depth, double wallT, double organic, int seed)
  {
    int uCount = 22;
    int vCount = 16;
    var outer = new int[vCount + 1, uCount + 1];
    var inner = new int[vCount + 1, uCount + 1];
    var mesh = new Mesh();

    double backY = c.Y - 0.08;
    double innerMaxY = c.Y - 0.025;

    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double uu = tu * 2.0 - 1.0;
        double absU = Math.Abs(uu);

        double phase = seed * 0.17 + tu * Math.PI * 2.0 + tv * Math.PI * 1.35;

        double sideTaper = 1.0 - Math.Pow(absU, 1.85);
        sideTaper = Math.Max(0.0, sideTaper);

        double widthAtZ =
          width * (0.42 + 0.58 * Math.Sin(0.20 * Math.PI + tv * 0.62 * Math.PI));
        widthAtZ *= 1.0 + Math.Sin(seed * 0.11 + tv * Math.PI * 2.0) * 0.08 * organic;

        double asym = Math.Sin(phase * 0.75) * width * 0.035 * organic;
        double x = c.X + uu * widthAtZ * 0.5 + asym * (1.0 - absU);

        double zBase = c.Z + (tv - 0.46) * height;
        double zOrganic = Math.Sin(phase) * height * 0.045 * organic * (1.0 - absU * 0.35);
        double lowerScoop = -Math.Exp(-Math.Pow((tv - 0.18) / 0.20, 2.0)) * height * 0.10;
        double upperLip = Math.Exp(-Math.Pow((tv - 0.92) / 0.11, 2.0)) * height * 0.09;
        double z = zBase + zOrganic + lowerScoop + upperLip;

        double belly =
          Math.Pow(Math.Sin(Math.PI * tv), 0.62) *
          Math.Pow(sideTaper, 0.42);
        double lipPush =
          Math.Exp(-Math.Pow((tv - 0.86) / 0.16, 2.0)) *
          (0.55 + 0.45 * sideTaper);
        double bottomCup =
          Math.Exp(-Math.Pow((tv - 0.28) / 0.18, 2.0)) *
          (0.35 + 0.65 * sideTaper);

        double y = backY - depth * (0.74 * belly + 0.20 * lipPush + 0.16 * bottomCup);
        y += Math.Sin(phase * 1.4) * depth * 0.035 * organic * sideTaper;

        // Side seams and bottom edge return cleanly toward the back plate.
        if (u == 0 || u == uCount) y = backY;
        if (v == 0) y = backY - depth * 0.10 * sideTaper;

        int oi = mesh.Vertices.Add(x, y, z);
        outer[v, u] = oi;

        double shrink = Clamp(wallT / Math.Max(width * 0.5, 0.001), 0.025, 0.18);
        double ix = c.X + (x - c.X) * (1.0 - shrink);
        double iz = z + wallT * (0.10 + 0.22 * (1.0 - tv));
        double iy = Math.Min(innerMaxY, y + wallT);

        int ii = mesh.Vertices.Add(ix, iy, iz);
        inner[v, u] = ii;
      }
    }

    // Outer faces: normals should point mostly toward outdoor / negative Y.
    for (int v = 0; v < vCount; v++)
    {
      for (int u = 0; u < uCount; u++)
      {
        int a = outer[v, u];
        int b = outer[v, u + 1];
        int d = outer[v + 1, u + 1];
        int cc = outer[v + 1, u];
        mesh.Faces.AddFace(a, b, d, cc);
      }
    }

    // Inner faces reversed: normals face into the planting cavity.
    for (int v = 0; v < vCount; v++)
    {
      for (int u = 0; u < uCount; u++)
      {
        int a = inner[v, u];
        int b = inner[v, u + 1];
        int d = inner[v + 1, u + 1];
        int cc = inner[v + 1, u];
        mesh.Faces.AddFace(a, cc, d, b);
      }
    }

    // Four perimeter caps make the shell visibly thick while leaving the planting cavity open.
    for (int u = 0; u < uCount; u++)
    {
      AddQuad(mesh, outer[0, u], inner[0, u], inner[0, u + 1], outer[0, u + 1]);                 // bottom edge
      AddQuad(mesh, outer[vCount, u], outer[vCount, u + 1], inner[vCount, u + 1], inner[vCount, u]); // top rim
    }

    for (int v = 0; v < vCount; v++)
    {
      AddQuad(mesh, outer[v, 0], outer[v + 1, 0], inner[v + 1, 0], inner[v, 0]);                 // left edge
      AddQuad(mesh, outer[v, uCount], inner[v, uCount], inner[v + 1, uCount], outer[v + 1, uCount]); // right edge
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    EnsureOutdoorNormals(mesh);

    var result = new PocketData();
    result.Shell = mesh;
    result.Soil = MakeSoilMesh(c, width * 0.56, depth * 0.46, height * 0.07, c.Y - depth * 0.45, c.Z + height * 0.12, organic, seed);
    result.OuterRim = MakeRimCurve(mesh, outer, vCount, uCount);
    result.InnerRim = MakeRimCurve(mesh, inner, vCount, uCount);

    result.DebugCurves.Add(result.OuterRim);
    result.DebugCurves.Add(MakeRimCurve(mesh, outer, 0, uCount));

    for (int i = -1; i <= 1; i++)
    {
      double dx = i * width * 0.13;
      Point3d p = new Point3d(c.X + dx, c.Y - depth * 0.50, c.Z - height * 0.34);
      result.DrainCurves.Add(new Circle(new Plane(p, Vector3d.YAxis), Math.Max(0.045, wallT * 0.32)).ToNurbsCurve());
    }

    return result;
  }

  Mesh MakeSoilMesh(Point3d c, double width, double depth, double thickness, double y, double z, double organic, int seed)
  {
    int n = 36;
    var mesh = new Mesh();
    int topCenter = mesh.Vertices.Add(c.X, y, z);
    int bottomCenter = mesh.Vertices.Add(c.X, y, z - thickness);
    var top = new int[n];
    var bottom = new int[n];

    for (int i = 0; i < n; i++)
    {
      double a = Math.PI * 2.0 * i / n;
      double ripple = 1.0 + (Math.Sin(a * 3.0 + seed * 0.2) * 0.045 + Math.Sin(a * 5.0 + seed * 0.11) * 0.025) * organic;
      double x = c.X + Math.Cos(a) * width * 0.5 * ripple;
      double yy = y + Math.Sin(a) * depth * 0.5 * ripple;
      double zz = z + Math.Sin(a * 2.0 + seed) * thickness * 0.20 * organic;
      top[i] = mesh.Vertices.Add(x, yy, zz);
      bottom[i] = mesh.Vertices.Add(x, yy, zz - thickness);
    }

    for (int i = 0; i < n; i++)
    {
      int j = (i + 1) % n;
      mesh.Faces.AddFace(topCenter, top[i], top[j]);
      mesh.Faces.AddFace(bottomCenter, bottom[j], bottom[i]);
      mesh.Faces.AddFace(top[i], bottom[i], bottom[j], top[j]);
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  Curve MakeRimCurve(Mesh mesh, int[,] ids, int vIndex, int uCount)
  {
    var pts = new List<Point3d>();
    for (int u = 0; u <= uCount; u++)
    {
      pts.Add(mesh.Vertices[ids[vIndex, u]]);
    }
    return new Polyline(pts).ToNurbsCurve();
  }

  void AddQuad(Mesh mesh, int a, int b, int c, int d)
  {
    mesh.Faces.AddFace(a, b, c, d);
  }

  void EnsureOutdoorNormals(Mesh mesh)
  {
    mesh.FaceNormals.ComputeFaceNormals();
    double ySum = 0.0;
    int checkedFaces = 0;

    for (int i = 0; i < mesh.FaceNormals.Count; i++)
    {
      Vector3f n = mesh.FaceNormals[i];
      if (Math.Abs(n.Y) > 0.15)
      {
        ySum += n.Y;
        checkedFaces++;
      }
    }

    if (checkedFaces > 0 && ySum > 0.0)
    {
      mesh.Flip(true, true, true);
      mesh.Normals.ComputeNormals();
    }
  }

  Brep BoxBrep(Point3d a, Point3d b)
  {
    var x = new Interval(Math.Min(a.X, b.X), Math.Max(a.X, b.X));
    var y = new Interval(Math.Min(a.Y, b.Y), Math.Max(a.Y, b.Y));
    var z = new Interval(Math.Min(a.Z, b.Z), Math.Max(a.Z, b.Z));
    return new Box(Plane.WorldXY, x, y, z).ToBrep();
  }

  double Clamp(double x, double lo, double hi)
  {
    return Math.Max(lo, Math.Min(hi, x));
  }
}
