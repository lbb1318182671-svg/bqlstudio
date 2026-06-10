// Grasshopper Script Instance
// Organic planter pocket - single surface version for GH Offset
//
// Rhino units: feet
//
// Inputs:
// W double                  // overall study width, e.g. 18
// FloorH double             // floor-to-floor height, e.g. 12
// Levels int                // e.g. 2 or 3
// PlantersPerLevel int      // e.g. 4
// PlanterScale double       // e.g. 1.0
// Organic double            // 0 to 1, e.g. 0.75
// Seed int                  // e.g. 7
//
// Outputs:
// PocketSurfaces            // Mesh, single open bowl surface, no thickness
// PocketSoils               // Mesh, higher soil surface
// PocketRims                // Curve, open rim loop
// BackPlates                // Brep, flat mounting datum
// Brackets                  // Brep, simple support arms
// DrainHoles                // Curve
// Plants                    // Curve
// Leaves                    // Curve
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
    int Seed,
    ref object PocketSurfaces,
    ref object PocketSoils,
    ref object PocketRims,
    ref object BackPlates,
    ref object Brackets,
    ref object DrainHoles,
    ref object Plants,
    ref object Leaves,
    ref object DebugProfiles)
  {
    W = Math.Max(W, 8.0);
    FloorH = Math.Max(FloorH, 8.0);
    Levels = Math.Max(Levels, 1);
    PlantersPerLevel = Math.Max(PlantersPerLevel, 1);
    PlanterScale = Math.Max(PlanterScale, 0.35);
    Organic = Clamp(Organic, 0.0, 1.0);

    var pocketSurfaces = new List<object>();
    var pocketSoils = new List<object>();
    var pocketRims = new List<object>();
    var backPlates = new List<object>();
    var brackets = new List<object>();
    var drainHoles = new List<object>();
    var plantCurves = new List<object>();
    var leafCurves = new List<object>();
    var debugProfiles = new List<object>();

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
          (0.84 + 0.22 * Math.Sin((v + 0.16) * Math.PI)) *
          (1.0 + 0.14 * Math.Sin(j * 1.71 + level * 0.83 + Seed * 0.13)) *
          (1.0 + (random.NextDouble() - 0.5) * 0.22 * Organic);

        double scale = PlanterScale * sizeBias;
        double x = -W * 0.5 + bayStep * (j + 0.5);
        x += (random.NextDouble() - 0.5) * bayStep * 0.28 * Organic;

        double z = level * FloorH + FloorH * (0.52 + 0.08 * Math.Sin(j * 1.2 + level * 0.7 + Seed * 0.2));
        z += (random.NextDouble() - 0.5) * FloorH * 0.08 * Organic;

        double width = bayStep * (0.78 + 0.12 * Organic) * scale;
        double height = FloorH * (0.34 + 0.05 * Organic) * scale;
        double depth = (1.55 + 0.55 * Organic) * scale;

        PocketData pocket = MakePocket(
          new Point3d(x, facadeY, z),
          width,
          height,
          depth,
          Organic,
          Seed + level * 97 + j * 31);

        pocketSurfaces.Add(pocket.Surface);
        pocketSoils.Add(pocket.Soil);
        pocketRims.Add(pocket.Rim);
        backPlates.Add(pocket.BackPlate);

        foreach (Brep b in pocket.Brackets) brackets.Add(b);
        foreach (Curve c in pocket.DrainHoles) drainHoles.Add(c);
        foreach (Curve c in pocket.Plants) plantCurves.Add(c);
        foreach (Curve c in pocket.Leaves) leafCurves.Add(c);
        foreach (Curve c in pocket.DebugCurves) debugProfiles.Add(c);
      }
    }

    Print("Generated " + pocketSurfaces.Count + " single-surface pockets. Facade plane is Y=0; pockets project toward negative Y.");
    Print("Use GH Offset Mesh / Weaverbird thicken on PocketSurfaces if you want shell thickness.");

    PocketSurfaces = pocketSurfaces;
    PocketSoils = pocketSoils;
    PocketRims = pocketRims;
    BackPlates = backPlates;
    Brackets = brackets;
    DrainHoles = drainHoles;
    Plants = plantCurves;
    Leaves = leafCurves;
    DebugProfiles = debugProfiles;
  }

  class PocketData
  {
    public Mesh Surface;
    public Mesh Soil;
    public Curve Rim;
    public Brep BackPlate;
    public List<Brep> Brackets = new List<Brep>();
    public List<Curve> DrainHoles = new List<Curve>();
    public List<Curve> Plants = new List<Curve>();
    public List<Curve> Leaves = new List<Curve>();
    public List<Curve> DebugCurves = new List<Curve>();
  }

  PocketData MakePocket(Point3d c, double width, double height, double depth, double organic, int seed)
  {
    int uCount = 34;
    int vCount = 22;

    var mesh = new Mesh();
    var ids = new int[vCount + 1, uCount + 1];
    var rimPts = new List<Point3d>();
    var midSection = new List<Point3d>();

    double backY = c.Y - 0.06;
    double frontY = c.Y - depth;
    double rimBackZ = c.Z + height * 0.40;
    double rimFrontZ = c.Z + height * 0.18;
    double bowlBottomZ = c.Z - height * 0.34;

    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;
      double y = Lerp(backY, frontY, tv);

      double rimZ = Lerp(rimBackZ, rimFrontZ, tv);
      rimZ += Math.Sin(tv * Math.PI * 1.1 + seed * 0.19) * height * 0.035 * organic;

      double halfW = width * 0.5 * (0.70 + 0.30 * Math.Sin(tv * Math.PI));
      halfW *= 1.0 + Math.Sin(tv * Math.PI * 2.0 + seed * 0.11) * 0.060 * organic;

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double su = tu * 2.0 - 1.0;
        double absS = Math.Abs(su);
        double phase = seed * 0.17 + tu * Math.PI * 2.0 + tv * Math.PI * 1.55;

        double sideEdge = Math.Pow(absS, 2.35);
        double frontBackEdge = Math.Pow(Math.Abs(tv - 0.54) / 0.54, 2.15);
        frontBackEdge = Clamp(frontBackEdge, 0.0, 1.0);
        double boundaryLift = Math.Max(sideEdge, frontBackEdge);

        double bottomCup =
          bowlBottomZ
          - Math.Exp(-Math.Pow((tv - 0.58) / 0.29, 2.0)) * height * 0.055
          + Math.Sin(phase) * height * 0.026 * organic * (1.0 - boundaryLift);

        double z = Lerp(bottomCup, rimZ, boundaryLift);
        double x = c.X + su * halfW + Math.Sin(phase * 0.75) * width * 0.030 * organic * (1.0 - absS);

        ids[v, u] = mesh.Vertices.Add(x, y, z);
        if (v == vCount / 2) midSection.Add(new Point3d(x, y, z));
      }
    }

    for (int v = 0; v < vCount; v++)
    {
      for (int u = 0; u < uCount; u++)
      {
        int a = ids[v, u];
        int b = ids[v, u + 1];
        int d = ids[v + 1, u + 1];
        int cc = ids[v + 1, u];
        mesh.Faces.AddFace(a, b, d, cc);
      }
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    OrientNormalsTowardOutdoor(mesh);

    for (int u = 0; u <= uCount; u++) rimPts.Add(mesh.Vertices[ids[0, u]]);
    for (int v = 1; v <= vCount; v++) rimPts.Add(mesh.Vertices[ids[v, uCount]]);
    for (int u = uCount - 1; u >= 0; u--) rimPts.Add(mesh.Vertices[ids[vCount, u]]);
    for (int v = vCount - 1; v >= 1; v--) rimPts.Add(mesh.Vertices[ids[v, 0]]);
    rimPts.Add(rimPts[0]);

    var result = new PocketData();
    result.Surface = mesh;
    result.Rim = new Polyline(rimPts).ToNurbsCurve();

    double soilZ = c.Z + height * 0.02;
    double soilY = c.Y - depth * 0.54;
    result.Soil = MakeSoilSurface(c, width * 0.66, depth * 0.50, soilY, soilZ, organic, seed);

    result.BackPlate = BoxBrep(
      new Point3d(c.X - width * 0.38, c.Y - 0.055, c.Z - height * 0.26),
      new Point3d(c.X + width * 0.38, c.Y + 0.055, c.Z + height * 0.34));

    AddBrackets(result, c, width, height, depth);
    AddDrainHoles(result, c, width, height, depth);
    AddPlants(result, c, width, height, depth, soilZ, organic, seed);

    result.DebugCurves.Add(result.Rim);
    result.DebugCurves.Add(new Polyline(midSection).ToNurbsCurve());
    return result;
  }

  void AddBrackets(PocketData result, Point3d c, double width, double height, double depth)
  {
    double tube = Math.Max(0.07, Math.Min(width, height) * 0.035);
    double armZ = c.Z - height * 0.18;
    double armInsetX = width * 0.22;

    for (int s = -1; s <= 1; s += 2)
    {
      double bx = c.X + s * armInsetX;

      result.Brackets.Add(BoxBrep(
        new Point3d(bx - tube, c.Y - depth * 0.70, armZ - tube),
        new Point3d(bx + tube, c.Y + 0.04, armZ + tube)));

      result.Brackets.Add(BoxBrep(
        new Point3d(bx - tube * 1.7, c.Y - 0.07, armZ - height * 0.09),
        new Point3d(bx + tube * 1.7, c.Y + 0.07, armZ + height * 0.09)));
    }

    result.Brackets.Add(BoxBrep(
      new Point3d(c.X - width * 0.27, c.Y - depth * 0.56, c.Z - height * 0.30),
      new Point3d(c.X + width * 0.27, c.Y - depth * 0.40, c.Z - height * 0.30 + tube * 2.0)));
  }

  void AddDrainHoles(PocketData result, Point3d c, double width, double height, double depth)
  {
    for (int i = -1; i <= 1; i++)
    {
      Point3d p = new Point3d(c.X + i * width * 0.12, c.Y - depth * 0.53, c.Z - height * 0.30);
      result.DrainHoles.Add(new Circle(new Plane(p, Vector3d.YAxis), Math.Max(0.045, width * 0.015)).ToNurbsCurve());
    }
  }

  void AddPlants(PocketData result, Point3d c, double width, double height, double depth, double soilZ, double organic, int seed)
  {
    var random = new Random(seed + 509);
    int plantCount = 6 + (int)Math.Round(organic * 5.0);

    for (int i = 0; i < plantCount; i++)
    {
      double tx = (plantCount == 1) ? 0.5 : (double)i / (plantCount - 1);
      double sx = (tx - 0.5) * 2.0;
      double baseX = c.X + sx * width * (0.24 + 0.06 * random.NextDouble());
      double baseY = c.Y - depth * (0.47 + 0.15 * random.NextDouble());
      double baseZ = soilZ + 0.02;

      double lean = (random.NextDouble() - 0.5) * width * 0.12;
      double rise = height * (0.18 + random.NextDouble() * 0.34);
      double forward = depth * (0.08 + random.NextDouble() * 0.16);

      Point3d p0 = new Point3d(baseX, baseY, baseZ);
      Point3d p1 = new Point3d(baseX + lean * 0.35, baseY - forward * 0.25, baseZ + rise * 0.38);
      Point3d p2 = new Point3d(baseX + lean, baseY - forward, baseZ + rise);

      var vine = new Polyline();
      vine.Add(p0);
      vine.Add(p1);
      vine.Add(p2);
      result.Plants.Add(vine.ToNurbsCurve());

      for (int k = 1; k <= 2; k++)
      {
        double t = k / 3.0;
        Point3d leafC = t < 0.5 ? LerpPoint(p0, p1, t * 2.0) : LerpPoint(p1, p2, (t - 0.5) * 2.0);
        double side = ((i + k) % 2 == 0) ? 1.0 : -1.0;
        double leafW = width * (0.030 + random.NextDouble() * 0.025);
        double leafH = height * (0.025 + random.NextDouble() * 0.020);

        var leaf = new Polyline();
        leaf.Add(new Point3d(leafC.X, leafC.Y, leafC.Z));
        leaf.Add(new Point3d(leafC.X + side * leafW, leafC.Y - leafW * 0.35, leafC.Z + leafH));
        leaf.Add(new Point3d(leafC.X + side * leafW * 1.65, leafC.Y - leafW * 0.12, leafC.Z));
        leaf.Add(new Point3d(leafC.X + side * leafW, leafC.Y + leafW * 0.22, leafC.Z - leafH * 0.50));
        leaf.Add(new Point3d(leafC.X, leafC.Y, leafC.Z));
        result.Leaves.Add(leaf.ToNurbsCurve());
      }
    }
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
      double taper = 0.70 + 0.30 * Math.Sin(ty * Math.PI);

      for (int ix = 0; ix <= xCount; ix++)
      {
        double tx = (double)ix / xCount;
        double sx = tx * 2.0 - 1.0;
        double zz = z + Math.Sin(tx * Math.PI * 2.0 + seed * 0.21) * 0.018 * organic;
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

  void OrientNormalsTowardOutdoor(Mesh mesh)
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

    // Pockets project to negative Y. For later Offset, make the main normals prefer negative Y.
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

  Point3d LerpPoint(Point3d a, Point3d b, double t)
  {
    return new Point3d(Lerp(a.X, b.X, t), Lerp(a.Y, b.Y, t), Lerp(a.Z, b.Z, t));
  }

  double Clamp(double x, double lo, double hi)
  {
    return Math.Max(lo, Math.Min(hi, x));
  }
}
