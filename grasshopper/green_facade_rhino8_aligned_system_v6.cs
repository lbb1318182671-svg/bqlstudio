// Grasshopper Script Instance
// V6: strict datum alignment + clear load path + true pocket basin
//
// Inputs keep the same:
// W double, FloorH double, Levels int, CorridorD double, MeshGap double,
// PlantersPerLevel int, PlanterScale double, Organic double, Seed int
//
// Outputs, in this order. Keep ALL output type hints as Generic / No Type Hint:
// PrimaryStructure
// SpandrelEnvelope
// CorridorStructure
// GlazingSystem
// Armature
// MeshInfill
// PocketModules
// PocketSupports
// Plants
// Roof

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
  #region Notes
  /*
    V6 rules:
    - Every floor uses one fixed datum: FFL.
    - CLT slab top = FFL; facade edge beam sits directly below the CLT slab.
    - Spandrel is not structure; it is an insulated slab-edge cover around slab + edge beam.
    - Glazing runs exactly between lower spandrel top and upper spandrel bottom.
    - Corridor deck is separate, slightly lower, with joists tied back to a ledger at the slab edge.
    - Armature posts/rails are supported from corridor edge beams; mesh is only infill.
    - Pocket brackets clamp to armature rails/posts, not to the mesh.
  */
  #endregion

  private void RunScript(
    double W,
    double FloorH,
    int Levels,
    double CorridorD,
    double MeshGap,
    int PlantersPerLevel,
    double PlanterScale,
    double Organic,
    int Seed,
    ref object PrimaryStructure,
    ref object SpandrelEnvelope,
    ref object CorridorStructure,
    ref object GlazingSystem,
    ref object Armature,
    ref object MeshInfill,
    ref object PocketModules,
    ref object PocketSupports,
    ref object Plants,
    ref object Roof)
  {
    W = Math.Max(W, 10.0);
    FloorH = Math.Max(FloorH, 9.0);
    Levels = Math.Max(Levels, 1);
    CorridorD = Math.Max(CorridorD, 3.0);
    MeshGap = Math.Max(MeshGap, 0.8);
    PlantersPerLevel = Math.Max(PlantersPerLevel, 1);
    PlanterScale = Math.Max(PlanterScale, 0.65);
    Organic = Math.Max(0.0, Math.Min(Organic, 1.0));

    var primary = new List<object>();
    var spandrel = new List<object>();
    var corridor = new List<object>();
    var glazing = new List<object>();
    var armature = new List<object>();
    var mesh = new List<object>();
    var pockets = new List<object>();
    var pocketSupports = new List<object>();
    var plants = new List<object>();
    var roof = new List<object>();

    double totalH = Levels * FloorH;

    // Y coordinates. Positive Y is interior, negative Y is exterior.
    double facadeY = 0.0;
    double interiorFaceY = 0.28;
    double interiorDepth = 7.2;
    double spandrelOuterY = -0.18;
    double thermalBreakGap = 0.34;
    double corridorInnerY = spandrelOuterY - thermalBreakGap;
    double corridorOuterY = corridorInnerY - CorridorD;
    double armatureY = corridorOuterY - MeshGap;
    double meshY = armatureY - 0.035;

    // Vertical construction dimensions.
    double cltThick = 0.58;
    double edgeBeamDepth = 1.00;
    double edgeBeamWidth = 0.62;
    double spandrelUp = 0.62;
    double spandrelDown = cltThick + edgeBeamDepth + 0.10;
    double corridorDrop = 0.12;
    double corridorDeckThick = 0.30;
    double corridorJoistDepth = 0.62;

    double postR = 0.075;
    double railR = 0.060;
    double meshR = 0.024;

    // Floor-by-floor primary structure and aligned spandrel zones.
    for (int i = 0; i <= Levels; i++)
    {
      double ffl = i * FloorH;
      double slabTop = ffl;
      double slabBottom = ffl - cltThick;
      double edgeBeamTop = slabBottom;
      double edgeBeamBottom = edgeBeamTop - edgeBeamDepth;
      double spandrelBottom = ffl - spandrelDown;
      double spandrelTop = ffl + spandrelUp;

      // CLT panel.
      primary.Add(BoxBrep(
        new Point3d(-W * 0.58, interiorFaceY, slabBottom),
        new Point3d(W * 0.58, interiorDepth, slabTop)));

      // Facade edge beam sits directly below the CLT slab edge.
      primary.Add(BoxBrep(
        new Point3d(-W * 0.60, -0.04, edgeBeamBottom),
        new Point3d(W * 0.60, -0.04 + edgeBeamWidth, edgeBeamTop)));

      // Perpendicular ribs land into the edge beam, not floating past it.
      for (int b = 0; b <= 4; b++)
      {
        double x = -W * 0.55 + W * 1.10 * b / 4.0;
        primary.Add(BoxBrep(
          new Point3d(x - 0.16, interiorFaceY, slabBottom - 0.40),
          new Point3d(x + 0.16, interiorDepth, slabBottom)));

        primary.Add(BoxBrep(
          new Point3d(x - 0.14, -0.06, slabBottom - 0.38),
          new Point3d(x + 0.14, interiorFaceY + 0.06, slabBottom - 0.06)));
      }

      // Spandrel/envelope cover: fills the entire slab-edge + edge-beam zone.
      spandrel.Add(BoxBrep(
        new Point3d(-W * 0.575, spandrelOuterY, spandrelBottom),
        new Point3d(W * 0.575, interiorFaceY + 0.10, spandrelTop)));

      // Exterior cover plate and interior finish strip make the gap legible.
      spandrel.Add(BoxBrep(
        new Point3d(-W * 0.585, spandrelOuterY - 0.035, spandrelBottom + 0.05),
        new Point3d(W * 0.585, spandrelOuterY + 0.025, spandrelTop - 0.05)));

      // Thermal-break curb/threshold, flush with the spandrel datum.
      spandrel.Add(BoxBrep(
        new Point3d(-W * 0.58, corridorInnerY, ffl - 0.12),
        new Point3d(W * 0.58, spandrelOuterY, ffl + 0.42)));
    }

    // Glazing is exactly between spandrel bands.
    for (int i = 0; i < Levels; i++)
    {
      double lowerFfl = i * FloorH;
      double upperFfl = (i + 1) * FloorH;
      double sillZ = lowerFfl + spandrelUp;
      double headZ = upperFfl - spandrelDown;

      glazing.Add(BoxBrep(
        new Point3d(-W * 0.54, -0.04, sillZ),
        new Point3d(W * 0.54, 0.105, headZ)));

      // Sill/head frames align exactly with spandrel edges.
      glazing.Add(BoxBrep(new Point3d(-W * 0.55, -0.12, sillZ - 0.06), new Point3d(W * 0.55, 0.18, sillZ + 0.06)));
      glazing.Add(BoxBrep(new Point3d(-W * 0.55, -0.12, headZ - 0.06), new Point3d(W * 0.55, 0.18, headZ + 0.06)));

      for (int m = 0; m <= 5; m++)
      {
        double x = -W * 0.54 + W * 1.08 * m / 5.0;
        glazing.Add(BoxBrep(
          new Point3d(x - 0.035, -0.11, sillZ),
          new Point3d(x + 0.035, 0.18, headZ)));
      }

      double midZ = sillZ + (headZ - sillZ) * 0.50;
      glazing.Add(BoxBrep(new Point3d(-W * 0.55, -0.10, midZ - 0.030), new Point3d(W * 0.55, 0.18, midZ + 0.030)));
    }

    // Corridor structure: separate deck, inner ledger, joists, outer edge beam.
    for (int i = 0; i <= Levels; i++)
    {
      double ffl = i * FloorH;
      double deckTop = ffl - corridorDrop;
      double deckBottom = deckTop - corridorDeckThick;
      double joistBottom = deckTop - corridorJoistDepth;

      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, corridorOuterY, deckBottom),
        new Point3d(W * 0.62, corridorInnerY, deckTop)));

      // Inner ledger aligns with the slab-edge datum and receives corridor joists.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, corridorInnerY - 0.08, joistBottom),
        new Point3d(W * 0.62, corridorInnerY + 0.08, deckBottom)));

      // Outer edge beam receives posts/base plates.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, corridorOuterY - 0.18, joistBottom),
        new Point3d(W * 0.62, corridorOuterY + 0.14, deckBottom)));

      for (int b = 0; b <= 4; b++)
      {
        double x = -W * 0.55 + W * 1.10 * b / 4.0;

        corridor.Add(BoxBrep(
          new Point3d(x - 0.13, corridorOuterY, joistBottom),
          new Point3d(x + 0.13, corridorInnerY, deckBottom)));

        // Tie-back plate bridges from corridor ledger to spandrel/edge-beam zone.
        corridor.Add(BoxBrep(
          new Point3d(x - 0.12, corridorInnerY, joistBottom + 0.05),
          new Point3d(x + 0.12, spandrelOuterY + 0.02, deckBottom + 0.02)));
      }
    }

    for (int i = 0; i < Levels; i++)
    {
      double deckTop = i * FloorH - corridorDrop;
      double railZ = deckTop + 3.55;

      for (int b = 0; b <= 4; b++)
      {
        double x = -W * 0.55 + W * 1.10 * b / 4.0;
        corridor.Add(BoxBrep(
          new Point3d(x - 0.045, corridorOuterY - 0.07, deckTop + 0.08),
          new Point3d(x + 0.045, corridorOuterY + 0.07, railZ)));
      }

      corridor.Add(CylinderBetween(new Point3d(-W * 0.62, corridorOuterY, railZ), new Point3d(W * 0.62, corridorOuterY, railZ), 0.055));
      corridor.Add(CylinderBetween(new Point3d(-W * 0.62, corridorOuterY, deckTop + 1.85), new Point3d(W * 0.62, corridorOuterY, deckTop + 1.85), 0.038));
    }

    // Roof, aligned with final FFL datum.
    double roofFfl = totalH;
    roof.Add(BoxBrep(new Point3d(-W * 0.58, interiorFaceY, roofFfl), new Point3d(W * 0.58, interiorDepth, roofFfl + cltThick)));
    roof.Add(BoxBrep(new Point3d(-W * 0.58, interiorFaceY, roofFfl + cltThick), new Point3d(W * 0.58, interiorDepth, roofFfl + cltThick + 0.44)));
    roof.Add(BoxBrep(new Point3d(-W * 0.64, spandrelOuterY - 0.05, roofFfl + 0.24), new Point3d(W * 0.64, interiorFaceY + 0.18, roofFfl + 1.22)));
    roof.Add(BoxBrep(new Point3d(-W * 0.68, spandrelOuterY - 0.12, roofFfl + 1.22), new Point3d(W * 0.68, interiorFaceY + 0.30, roofFfl + 1.36)));

    // Armature: continuous posts and rails, supported by corridor outer edge beam.
    AddPipeRect(armature, -W * 0.68, armatureY, 0.0, W * 0.68, armatureY, totalH, postR);

    for (int m = 0; m <= 4; m++)
    {
      double x = -W * 0.60 + W * 1.20 * m / 4.0;
      armature.Add(CylinderBetween(new Point3d(x, armatureY, 0.0), new Point3d(x, armatureY, totalH), postR));

      for (int i = 0; i <= Levels; i++)
      {
        double deckTop = i * FloorH - corridorDrop;
        double beamZ = deckTop - corridorJoistDepth * 0.55;

        // Base plate on the corridor outer edge beam.
        armature.Add(BoxBrep(
          new Point3d(x - 0.20, corridorOuterY - 0.08, beamZ - 0.04),
          new Point3d(x + 0.20, corridorOuterY + 0.12, beamZ + 0.08)));

        // Stand-off arm from edge beam to armature post.
        armature.Add(CylinderBetween(
          new Point3d(x, corridorOuterY - 0.02, beamZ),
          new Point3d(x, armatureY, beamZ),
          0.055));
      }
    }

    // Rails are continuous and intersect posts.
    for (int i = 0; i <= Levels; i++)
    {
      double z = i * FloorH;
      armature.Add(CylinderBetween(new Point3d(-W * 0.68, armatureY, z), new Point3d(W * 0.68, armatureY, z), railR));
    }

    for (int i = 0; i < Levels; i++)
    {
      double pocketRailZ = i * FloorH + FloorH * 0.48;
      armature.Add(CylinderBetween(new Point3d(-W * 0.66, armatureY, pocketRailZ), new Point3d(W * 0.66, armatureY, pocketRailZ), railR));
    }

    // Mesh infill: clipped just inside the armature and sharing diamond endpoints.
    double dx = W / 6.0;
    double dz = FloorH / 3.0;
    for (double x = -W * 0.66; x <= W * 0.66; x += dx)
    {
      for (double z = 0.0; z <= totalH - dz; z += dz)
      {
        Point3d a = new Point3d(x, meshY, z);
        Point3d b = new Point3d(x + dx * 0.5, meshY, z + dz * 0.5);
        Point3d c = new Point3d(x, meshY, z + dz);
        Point3d d = new Point3d(x - dx * 0.5, meshY, z + dz * 0.5);
        mesh.Add(CylinderBetween(a, b, meshR));
        mesh.Add(CylinderBetween(b, c, meshR));
        mesh.Add(CylinderBetween(c, d, meshR));
        mesh.Add(CylinderBetween(d, a, meshR));
      }
    }

    // Pocket modules and pocket supports.
    var random = new Random(Seed);
    double bayStep = W / PlantersPerLevel;
    for (int level = 0; level < Levels; level++)
    {
      double pocketRailZ = level * FloorH + FloorH * 0.48;

      for (int j = 0; j < PlantersPerLevel; j++)
      {
        double x = -W * 0.5 + bayStep * (j + 0.5);
        double jitter = (random.NextDouble() - 0.5) * bayStep * 0.14 * Organic;
        double width = bayStep * 0.68 * PlanterScale;
        double height = FloorH * 0.20 * PlanterScale;
        double depth = 0.95 * PlanterScale;
        double shellT = 0.12 * PlanterScale;
        Point3d pc = new Point3d(x + jitter, armatureY - 0.12, pocketRailZ);

        pockets.Add(TruePocketShell(pc, width, height, depth, shellT, Organic, Seed + level * 41 + j * 17));
        pockets.Add(BackSpine(pc, width, height, shellT, armatureY));

        List<Point3d> lipPts = PocketLipPoints(pc, width, height, depth, Organic, Seed + j * 13);
        for (int l = 0; l < lipPts.Count - 1; l++)
          pockets.Add(CylinderBetween(lipPts[l], lipPts[l + 1], Math.Max(0.075, shellT * 0.55)));

        pockets.Add(SoilSurfaceMesh(pc, width * 0.56, depth * 0.60, pc.Z + height * 0.20, pc.Y - depth * 0.60));
        foreach (Curve rib in PocketRibCurves(pc, width, height, depth, Organic, Seed + j * 19)) pockets.Add(rib);
        foreach (Curve hole in DrainHoleCurves(pc, width, height, depth)) pockets.Add(hole);

        // Support clamps attach to the pocket rail and post line, never to mesh.
        pocketSupports.Add(BoxBrep(new Point3d(pc.X - width * 0.30, armatureY - 0.08, pocketRailZ - 0.07), new Point3d(pc.X + width * 0.30, armatureY + 0.08, pocketRailZ + 0.07)));
        pocketSupports.Add(BoxBrep(new Point3d(pc.X - width * 0.31, armatureY + 0.07, pc.Z - height * 0.16), new Point3d(pc.X + width * 0.31, armatureY + 0.22, pc.Z + height * 0.16)));
        pocketSupports.Add(CylinderBetween(new Point3d(pc.X - width * 0.23, armatureY + 0.08, pc.Z - height * 0.10), new Point3d(pc.X - width * 0.23, armatureY + 0.44, pc.Z - height * 0.10), 0.060));
        pocketSupports.Add(CylinderBetween(new Point3d(pc.X + width * 0.23, armatureY + 0.08, pc.Z - height * 0.10), new Point3d(pc.X + width * 0.23, armatureY + 0.44, pc.Z - height * 0.10), 0.060));

        // Irrigation.
        List<Point3d> drip = new List<Point3d>();
        drip.Add(new Point3d(pc.X - width * 0.25, pc.Y - depth * 0.50, pc.Z + height * 0.20));
        drip.Add(new Point3d(pc.X - width * 0.08, pc.Y - depth * 0.60, pc.Z + height * 0.22));
        drip.Add(new Point3d(pc.X + width * 0.10, pc.Y - depth * 0.59, pc.Z + height * 0.20));
        drip.Add(new Point3d(pc.X + width * 0.25, pc.Y - depth * 0.50, pc.Z + height * 0.21));
        for (int q = 0; q < drip.Count - 1; q++) pockets.Add(CylinderBetween(drip[q], drip[q + 1], 0.025));

        for (int k = 0; k < 7; k++)
        {
          double px = pc.X + (random.NextDouble() - 0.5) * width * 0.50;
          double py = pc.Y - depth * (0.50 + random.NextDouble() * 0.15);
          double pz = pc.Z + height * 0.16;
          double rise = 0.45 + random.NextDouble() * 1.05;

          plants.Add(new ArcCurve(new Arc(
            new Point3d(px, py, pz),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.35, py - 0.10, pz + rise * 0.55),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.65, py - 0.04, pz + rise))));

          var vine = new Polyline();
          vine.Add(new Point3d(px, py, pz));
          vine.Add(new Point3d(px + 0.16 * Math.Sin(k + Seed), pc.Y - depth * 0.18, pz + rise * 0.76));
          vine.Add(new Point3d(px + 0.30 * Math.Cos(k), meshY, pz + rise * 1.20));
          plants.Add(vine.ToNurbsCurve());
        }
      }
    }

    Print("Generated V6: aligned datums, connected pipes, pocket-to-rail supports.");

    PrimaryStructure = primary;
    SpandrelEnvelope = spandrel;
    CorridorStructure = corridor;
    GlazingSystem = glazing;
    Armature = armature;
    MeshInfill = mesh;
    PocketModules = pockets;
    PocketSupports = pocketSupports;
    Plants = plants;
    Roof = roof;
  }

  Brep BoxBrep(Point3d a, Point3d b)
  {
    var x = new Interval(Math.Min(a.X, b.X), Math.Max(a.X, b.X));
    var y = new Interval(Math.Min(a.Y, b.Y), Math.Max(a.Y, b.Y));
    var z = new Interval(Math.Min(a.Z, b.Z), Math.Max(a.Z, b.Z));
    return new Box(Plane.WorldXY, x, y, z).ToBrep();
  }

  Brep CylinderBetween(Point3d a, Point3d b, double radius)
  {
    Vector3d axis = b - a;
    double length = axis.Length;
    if (length < 0.0001) return null;
    axis.Unitize();
    Plane plane = new Plane(a, axis);
    return new Cylinder(new Circle(plane, radius), length).ToBrep(true, true);
  }

  void AddPipeRect(List<object> target, double x0, double y0, double z0, double x1, double y1, double z1, double r)
  {
    Point3d a = new Point3d(x0, y0, z0);
    Point3d b = new Point3d(x1, y0, z0);
    Point3d c = new Point3d(x1, y1, z1);
    Point3d d = new Point3d(x0, y1, z1);
    target.Add(CylinderBetween(a, b, r));
    target.Add(CylinderBetween(b, c, r));
    target.Add(CylinderBetween(c, d, r));
    target.Add(CylinderBetween(d, a, r));
  }

  Brep BackSpine(Point3d c, double w, double h, double t, double armatureY)
  {
    return BoxBrep(
      new Point3d(c.X - w * 0.24, armatureY - 0.02, c.Z - h * 0.34),
      new Point3d(c.X + w * 0.24, armatureY + Math.Max(0.20, t * 1.4), c.Z + h * 0.34));
  }

  Mesh TruePocketShell(Point3d c, double w, double h, double d, double t, double organic, int seed)
  {
    int uCount = 30;
    int vCount = 16;
    var mesh = new Mesh();

    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;
      double zNorm = (tv - 0.5) * 2.0;
      double bowl = Math.Sin(tv * Math.PI);
      double topFlare = SmoothStep(0.55, 1.0, tv);
      double widthFactor = 0.46 + 0.42 * bowl + 0.28 * topFlare;

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double xNorm = (tu - 0.5) * 2.0;
        double side = 1.0 - Math.Abs(xNorm) * 0.12;
        double wave = Math.Sin(tu * Math.PI * 2.0 + seed * 0.10) * Math.Sin(tv * Math.PI * 1.8 + seed * 0.08);

        double x = c.X + xNorm * w * 0.5 * widthFactor;
        double z = c.Z + zNorm * h * 0.5 + wave * h * 0.040 * organic;
        double y = c.Y - d * (0.10 + 0.92 * bowl * side) + wave * d * 0.070 * organic;
        mesh.Vertices.Add(x, y, z);
      }
    }

    int outerCount = mesh.Vertices.Count;
    for (int v = 0; v <= vCount; v++)
    {
      for (int u = 0; u <= uCount; u++)
      {
        Point3f p = mesh.Vertices[v * (uCount + 1) + u];
        double tu = (double)u / uCount;
        double tv = (double)v / vCount;
        double shrinkX = (tu - 0.5) * w * 0.045;
        double shrinkZ = (tv - 0.5) * h * 0.055;
        mesh.Vertices.Add(p.X - shrinkX, p.Y + t, p.Z - shrinkZ);
      }
    }

    for (int v = 0; v < vCount; v++)
    {
      for (int u = 0; u < uCount; u++)
      {
        int a = v * (uCount + 1) + u;
        int b = a + 1;
        int c0 = a + (uCount + 1);
        int d0 = c0 + 1;
        mesh.Faces.AddFace(a, b, d0, c0);
        mesh.Faces.AddFace(outerCount + a, outerCount + c0, outerCount + d0, outerCount + b);
      }
    }

    // Close bottom and sides only. Top stays open as a real pocket.
    for (int u = 0; u < uCount; u++)
      mesh.Faces.AddFace(u, u + 1, outerCount + u + 1, outerCount + u);

    for (int v = 0; v < vCount; v++)
    {
      int left = v * (uCount + 1);
      int leftNext = (v + 1) * (uCount + 1);
      mesh.Faces.AddFace(left, outerCount + left, outerCount + leftNext, leftNext);

      int right = v * (uCount + 1) + uCount;
      int rightNext = (v + 1) * (uCount + 1) + uCount;
      mesh.Faces.AddFace(right, rightNext, outerCount + rightNext, outerCount + right);
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  Mesh SoilSurfaceMesh(Point3d c, double w, double d, double z, double y)
  {
    int segments = 28;
    var mesh = new Mesh();
    mesh.Vertices.Add(c.X, y, z);
    for (int i = 0; i <= segments; i++)
    {
      double t = Math.PI * 2.0 * i / segments;
      mesh.Vertices.Add(c.X + Math.Cos(t) * w * 0.5, y + Math.Sin(t) * d * 0.30, z + Math.Sin(t * 3.0) * 0.018);
    }
    for (int i = 1; i <= segments; i++) mesh.Faces.AddFace(0, i, i + 1);
    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  List<Point3d> PocketLipPoints(Point3d c, double w, double h, double d, double organic, int seed)
  {
    var pts = new List<Point3d>();
    for (int i = 0; i <= 18; i++)
    {
      double tu = (double)i / 18;
      double xNorm = (tu - 0.5) * 2.0;
      double x = c.X + xNorm * w * 0.58;
      double y = c.Y - d * (0.20 + 0.12 * (1.0 - Math.Abs(xNorm)));
      double z = c.Z + h * 0.50 + Math.Sin(tu * Math.PI * 2.0 + seed) * h * 0.028 * organic;
      pts.Add(new Point3d(x, y, z));
    }
    return pts;
  }

  List<Curve> PocketRibCurves(Point3d c, double w, double h, double d, double organic, int seed)
  {
    var ribs = new List<Curve>();
    for (int r = 0; r < 4; r++)
    {
      double tv = 0.18 + r * 0.18;
      var pl = new Polyline();
      for (int i = 0; i <= 24; i++)
      {
        double tu = (double)i / 24;
        double xNorm = (tu - 0.5) * 2.0;
        double bowl = Math.Sin(tv * Math.PI);
        double widthFactor = 0.50 + 0.38 * bowl;
        double wave = Math.Sin(tu * Math.PI * 2.0 + seed * 0.11) * 0.035 * organic;
        double x = c.X + xNorm * w * 0.5 * widthFactor;
        double y = c.Y - d * (0.17 + 0.74 * bowl * (1.0 - Math.Abs(xNorm) * 0.14));
        double z = c.Z + (tv - 0.5) * h + wave * h;
        pl.Add(new Point3d(x, y - 0.02, z + 0.02));
      }
      ribs.Add(pl.ToNurbsCurve());
    }
    return ribs;
  }

  List<Curve> DrainHoleCurves(Point3d c, double w, double h, double d)
  {
    var holes = new List<Curve>();
    for (int i = 0; i < 3; i++)
    {
      double x = c.X + (i - 1) * w * 0.14;
      double z = c.Z - h * 0.30;
      double y = c.Y - d * 0.70;
      Plane p = new Plane(new Point3d(x, y, z), Vector3d.YAxis);
      holes.Add(new Circle(p, Math.Max(0.045, w * 0.015)).ToNurbsCurve());
    }
    return holes;
  }

  double SmoothStep(double edge0, double edge1, double x)
  {
    double t = Math.Max(0.0, Math.Min(1.0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
  }
}
