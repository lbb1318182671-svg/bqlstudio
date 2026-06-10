// Grasshopper Script Instance
// Organic precast planter pockets - thick open bowl version
//
// Rhino units: feet
//
// Inputs:
// W double                  // overall study width, e.g. 18
// FloorH double             // floor-to-floor height, e.g. 12
// Levels int                // e.g. 3
// PlantersPerLevel int      // e.g. 4
// PlanterScale double       // e.g. 1.0
// Organic double            // 0 to 1, e.g. 0.75
// WallT double              // shell thickness in feet, e.g. 0.16
// Seed int                  // e.g. 7
//
// Outputs:
// PocketShells              // Mesh
// PocketSoils               // Mesh
// PocketRims                // Curve
// BackPlates                // Brep
// Brackets                  // Brep
// DrainHoles                // Curve
// DebugProfiles             // Curve

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
    ref object Brackets,
    ref object DrainHoles,
    ref object DebugProfiles)
  {
    W = Math.Max(W, 8.0);
    FloorH = Math.Max(FloorH, 8.0);
    Levels = Math.Max(Levels, 1);
    PlantersPerLevel = Math.Max(PlantersPerLevel, 1);
    PlanterScale = Math.Max(PlanterScale, 0.35);
    Organic = Clamp(Organic, 0.0, 1.0);
    WallT = Clamp(WallT, 0.06, 0.35);

    var shells = new List<object>();
    var soils = new List<object>();
    var rims = new List<object>();
    var backs = new List<object>();
    var brackets = new List<object>();
    var drains = new List<object>();
    var debug = new List<object>();

    var random = new Random(Seed);
    double bayStep = W / PlantersPerLevel;
    double facadeY = 0.0;

    for (int level = 0; level < Levels; level++)
    {
      for (int j = 0; j < PlantersPerLevel; j++)
      {
        double u = PlantersPerLevel == 1 ? 0.5 : (double)j / (PlantersPerLevel - 1);
        double v = Levels == 1 ? 0.5 : (double)level / (Levels - 1);

        double sizeBias =
          (0.84 + 0.22 * Math.Sin((u + 0.10) * Math.PI)) *
          (0.82 + 0.24 * Math.Sin((v + 0.16) * Math.PI)) *
          (1.0 + 0.16 * Math.Sin(j * 1.71 + level * 0.83 + Seed * 0.13)) *
          (1.0 + (random.NextDouble() - 0.5) * 0.25 * Organic);

        double scale = PlanterScale * sizeBias;
        double x = -W * 0.5 + bayStep * (j + 0.5);
        x += (random.NextDouble() - 0.5) * bayStep * 0.28 * Organic;

        double z = level * FloorH + FloorH * (0.52 + 0.08 * Math.Sin(j * 1.2 + level * 0.7 + Seed * 0.2));
        z += (random.NextDouble() - 0.5) * FloorH * 0.08 * Organic;

        double width = bayStep * (0.76 + 0.12 * Organic) * scale;
        double height = FloorH * (0.34 + 0.06 * Organic) * scale;
        double depth = (1.55 + 0.55 * Organic) * scale;

        PocketData pocket = MakeOpenBowlPocket(
          new Point3d(x, facadeY, z),
          width,
          height,
          depth,
          WallT,
          Organic,
          Seed + level * 97 + j * 31);

        shells.Add(pocket.Shell);
        soils.Add(pocket.Soil);
        rims.Add(pocket.Rim);
        backs.Add(pocket.BackPlate);

        foreach (Brep b in pocket.Brackets) brackets.Add(b);
        foreach (Curve c in pocket.DrainHoles) drains.Add(c);
        foreach (Curve c in pocket.DebugCurves) debug.Add(c);
      }
    }

    Print("Generated " + shells.Count + " open bowl pockets. The facade plane is Y=0; pockets project toward negative Y.");

    PocketShells = shells;
    PocketSoils = soils;
    PocketRims = rims;
    BackPlates = backs;
    Brackets = brackets;
    DrainHoles = drains;
    DebugProfiles = debug;
  }

  class PocketData
  {
    public Mesh Shell;
    public Mesh Soil;
    public Curve Rim;
    public Brep BackPlate;
    public List<Brep> Brackets = new List<Brep>();
    public List<Curve> DrainHoles = new List<Curve>();
    public List<Curve> DebugCurves = new List<Curve>();
  }

  PocketData MakeOpenBowlPocket(Point3d c, double width, double height, double depth, double wallT, double organic, int seed)
  {
    int uCount = 28; // across width
    int vCount = 18; // back-to-front depth

    var mesh = new Mesh();
    var inner = new int[vCount + 1, uCount + 1];
    var outer = new int[vCount + 1, uCount + 1];

    var rimPts = new List<Point3d>();
    var frontSectionPts = new List<Point3d>();

    double backYInner = c.Y - wallT;
    double frontYInner = c.Y - depth + wallT;
    double backYOuter = c.Y;
    double frontYOuter = c.Y - depth;

    double rimBackZ = c.Z + height * 0.36;
    double rimFrontZ = c.Z + height * 0.13;
    double bowlBottomZ = c.Z - height * 0.38;

    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;
      double yIn = Lerp(backYInner, frontYInner, tv);
      double yOut = Lerp(backYOuter, frontYOuter, tv);

      // Rim is higher at the facade side and lower at the front lip.
      double rimZ = Lerp(rimBackZ, rimFrontZ, tv);
      rimZ += Math.Sin(tv * Math.PI * 1.2 + seed * 0.19) * height * 0.035 * organic;

      double halfW = width * 0.5 * (0.72 + 0.28 * Math.Sin(tv * Math.PI));
      halfW *= 1.0 + Math.Sin(tv * Math.PI * 2.0 + seed * 0.11) * 0.055 * organic;

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double su = tu * 2.0 - 1.0;
        double absS = Math.Abs(su);

        double phase = seed * 0.17 + tu * Math.PI * 2.0 + tv * Math.PI * 1.55;
        double edge = Math.Pow(absS, 2.45);

        // Center bottom is low; side/back/front boundary rises to the rim.
        double frontBackEdge = Math.Pow(Math.Abs(tv - 0.52) / 0.52, 2.25);
        frontBackEdge = Clamp(frontBackEdge, 0.0, 1.0);
        double boundaryLift = Math.Max(edge, frontBackEdge);

        double bottomCup =
          bowlBottomZ
          - Math.Exp(-Math.Pow((tv - 0.58) / 0.28, 2.0)) * height * 0.06
          + Math.Sin(phase) * height * 0.025 * organic * (1.0 - boundaryLift);

        double zIn = Lerp(bottomCup, rimZ, boundaryLift);
        double xIn = c.X + su * halfW + Math.Sin(phase * 0.75) * width * 0.025 * organic * (1.0 - absS);

        Point3d pIn = new Point3d(xIn, yIn, zIn);

        // Approximate outward thickness: sides widen, bottom drops, front/back move outward.
        double sideSign = su < 0.0 ? -1.0 : 1.0;
        double xOut = xIn + sideSign * wallT * (0.55 + 0.65 * edge);
        double yOutAdj = yOut + Math.Sin(phase * 0.9) * depth * 0.018 * organic * (1.0 - boundaryLift);
        double zOut = zIn - wallT * (0.65 + 0.35 * (1.0 - boundaryLift));

        // Keep top rim thickness readable rather than collapsing exactly onto the inner rim.
        if (boundaryLift > 0.92) zOut = zIn - wallT * 0.55;

        Point3d pOut = new Point3d(xOut, yOutAdj, zOut);

        inner[v, u] = mesh.Vertices.Add(pIn);
        outer[v, u] = mesh.Vertices.Add(pOut);

        if (v == vCount / 2) frontSectionPts.Add(pIn);
      }
    }

    // Inner bowl surface: normals face into the soil cavity.
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

    // Outer surface: normals face outward.
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

    // Close the thickness around the whole rim/boundary. The top remains open because the bowl interior is not capped above.
    for (int u = 0; u < uCount; u++)
    {
      AddQuad(mesh, inner[0, u], outer[0, u], outer[0, u + 1], inner[0, u + 1]);                 // back rim
      AddQuad(mesh, inner[vCount, u], inner[vCount, u + 1], outer[vCount, u + 1], outer[vCount, u]); // front lip
    }

    for (int v = 0; v < vCount; v++)
    {
      AddQuad(mesh, inner[v, 0], inner[v + 1, 0], outer[v + 1, 0], outer[v, 0]);                 // left rim
      AddQuad(mesh, inner[v, uCount], outer[v, uCount], outer[v + 1, uCount], inner[v + 1, uCount]); // right rim
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    EnsureOutdoorNormals(mesh);

    // Rim loop goes around the upper/open boundary: back, right side, front lip, left side.
    for (int u = 0; u <= uCount; u++) rimPts.Add(mesh.Vertices[inner[0, u]]);
    for (int v = 1; v <= vCount; v++) rimPts.Add(mesh.Vertices[inner[v, uCount]]);
    for (int u = uCount - 1; u >= 0; u--) rimPts.Add(mesh.Vertices[inner[vCount, u]]);
    for (int v = vCount - 1; v >= 1; v--) rimPts.Add(mesh.Vertices[inner[v, 0]]);
    rimPts.Add(rimPts[0]);

    var result = new PocketData();
    result.Shell = mesh;
    result.Rim = new Polyline(rimPts).ToNurbsCurve();
    result.Soil = MakeSoilSurface(c, width * 0.62, depth * 0.54, c.Y - depth * 0.52, c.Z - height * 0.12, organic, seed);

    // Back plate is flush to facade plane and intentionally rectangular: this is the mount datum.
    result.BackPlate = BoxBrep(
      new Point3d(c.X - width * 0.42, c.Y - 0.06, c.Z - height * 0.34),
      new Point3d(c.X + width * 0.42, c.Y + 0.06, c.Z + height * 0.40));

    // Bracket set: two cantilever arms plus a bottom saddle and two bolt pads.
    double armZ = c.Z - height * 0.26;
    double saddleZ = c.Z - height * 0.36;
    double armHalf = Math.Max(0.04, wallT * 0.35);
    double armInsetX = width * 0.23;

    for (int s = -1; s <= 1; s += 2)
    {
      double bx = c.X + s * armInsetX;
      result.Brackets.Add(BoxBrep(
        new Point3d(bx - armHalf, c.Y - depth * 0.72, armZ - armHalf),
        new Point3d(bx + armHalf, c.Y + 0.05, armZ + armHalf)));

      result.Brackets.Add(BoxBrep(
        new Point3d(bx - armHalf * 1.7, c.Y - 0.08, armZ - height * 0.08),
        new Point3d(bx + armHalf * 1.7, c.Y + 0.09, armZ + height * 0.08)));
    }

    result.Brackets.Add(BoxBrep(
      new Point3d(c.X - width * 0.30, c.Y - depth * 0.64, saddleZ - armHalf),
      new Point3d(c.X + width * 0.30, c.Y - depth * 0.40, saddleZ + armHalf)));

    for (int i = -1; i <= 1; i++)
    {
      Point3d p = new Point3d(c.X + i * width * 0.12, c.Y - depth * 0.56, c.Z - height * 0.33);
      result.DrainHoles.Add(new Circle(new Plane(p, Vector3d.YAxis), Math.Max(0.04, wallT * 0.28)).ToNurbsCurve());
    }

    result.DebugCurves.Add(result.Rim);
    result.DebugCurves.Add(new Polyline(frontSectionPts).ToNurbsCurve());
    return result;
  }

  Mesh MakeSoilSurface(Point3d c, double width, double depth, double y, double z, double organic, int seed)
  {
    int xCount = 18;
    int yCount = 12;
    var mesh = new Mesh();
    var ids = new int[yCount + 1, xCount + 1];

    for (int iy = 0; iy <= yCount; iy++)
    {
      double ty = (double)iy / yCount;
      double yy = y + (ty - 0.5) * depth;
      double taper = 0.75 + 0.25 * Math.Sin(ty * Math.PI);

      for (int ix = 0; ix <= xCount; ix++)
      {
        double tx = (double)ix / xCount;
        double sx = tx * 2.0 - 1.0;
        double zz = z + Math.Sin(tx * Math.PI * 2.0 + seed * 0.21) * 0.025 * organic;
        double xx = c.X + sx * width * 0.5 * taper;
        ids[iy, ix] = mesh.Vertices.Add(xx, yy, zz);
      }
    }

    for (int iy = 0; iy < yCount; iy++)
    {
      for (int ix = 0; ix < xCount; ix++)
      {
        int a = ids[iy, ix];
        int b = ids[iy, ix + 1];
        int d = ids[iy + 1, ix + 1];
        int cc = ids[iy + 1, ix];
        mesh.Faces.AddFace(a, b, d, cc);
      }
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  void AddQuad(Mesh mesh, int a, int b, int c, int d)
  {
    mesh.Faces.AddFace(a, b, c, d);
  }

  void EnsureOutdoorNormals(Mesh mesh)
  {
    mesh.FaceNormals.ComputeFaceNormals();
    double ySum = 0.0;
    int count = 0;
    for (int i = 0; i < mesh.FaceNormals.Count; i++)
    {
      Vector3f n = mesh.FaceNormals[i];
      if (Math.Abs(n.Y) > 0.18)
      {
        ySum += n.Y;
        count++;
      }
    }
    if (count > 0 && ySum > 0.0)
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

  double Lerp(double a, double b, double t)
  {
    return a + (b - a) * t;
  }

  double Clamp(double x, double lo, double hi)
  {
    return Math.Max(lo, Math.Min(hi, x));
  }
}
