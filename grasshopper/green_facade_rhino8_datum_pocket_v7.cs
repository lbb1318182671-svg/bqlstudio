// Grasshopper Script Instance
// V7: cleaner aligned datum + organic true pocket basins
//
// Inputs:
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
    Core datum:
    - structureFaceY is the exterior face of the building structure.
    - CLT slab and facade edge beam share that same exterior face.
    - SpandrelEnvelope covers that face; it does not carry gravity load.
    - Corridor has its own inner ledger and outer edge beam.
    - Armature posts stand off from the corridor outer edge beam.
    - Mesh is infill clipped into armature.
    - Pockets clamp to armature rails/posts, never to mesh.
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

    // Section Y datums. Positive Y = interior, negative Y = exterior.
    double structureFaceY = 0.0;
    double interiorDepth = 7.2;
    double spandrelOuterY = -0.18;
    double thermalGap = 0.36;
    double corridorInnerY = spandrelOuterY - thermalGap;
    double corridorOuterY = corridorInnerY - CorridorD;
    double armatureY = corridorOuterY - MeshGap;
    double meshY = armatureY - 0.035;

    // Structural dimensions.
    double cltThick = 0.58;
    double edgeBeamDepth = 1.00;
    double edgeBeamY = 0.62;          // beam extends inward from structureFaceY
    double spandrelUp = 0.62;
    double spandrelDown = cltThick + edgeBeamDepth + 0.10;
    double corridorDrop = 0.12;
    double corridorDeckThick = 0.30;
    double corridorBeamDepth = 0.62;
    double postR = 0.075;
    double railR = 0.060;
    double meshR = 0.024;

    // Primary structure and envelope bands. All slab/beam faces align at structureFaceY.
    for (int i = 0; i <= Levels; i++)
    {
      double ffl = i * FloorH;
      double slabTop = ffl;
      double slabBottom = ffl - cltThick;
      double edgeBeamTop = slabBottom;
      double edgeBeamBottom = edgeBeamTop - edgeBeamDepth;
      double spandrelBottom = ffl - spandrelDown;
      double spandrelTop = ffl + spandrelUp;

      // CLT slab: exterior face exactly at structureFaceY.
      primary.Add(BoxBrep(
        new Point3d(-W * 0.58, structureFaceY, slabBottom),
        new Point3d(W * 0.58, interiorDepth, slabTop)));

      // Facade edge beam: exterior face exactly aligns with CLT exterior face.
      primary.Add(BoxBrep(
        new Point3d(-W * 0.60, structureFaceY, edgeBeamBottom),
        new Point3d(W * 0.60, structureFaceY + edgeBeamY, edgeBeamTop)));

      // Interior perpendicular CLT ribs frame into the edge beam.
      for (int b = 0; b <= 4; b++)
      {
        double x = -W * 0.55 + W * 1.10 * b / 4.0;
        primary.Add(BoxBrep(
          new Point3d(x - 0.16, structureFaceY + edgeBeamY, slabBottom - 0.40),
          new Point3d(x + 0.16, interiorDepth, slabBottom)));
        primary.Add(BoxBrep(
          new Point3d(x - 0.14, structureFaceY + 0.02, slabBottom - 0.38),
          new Point3d(x + 0.14, structureFaceY + edgeBeamY + 0.05, slabBottom - 0.06)));
      }

      // Spandrel envelope wraps the aligned slab/beam edge.
      spandrel.Add(BoxBrep(
        new Point3d(-W * 0.575, spandrelOuterY, spandrelBottom),
        new Point3d(W * 0.575, structureFaceY + 0.08, spandrelTop)));
      spandrel.Add(BoxBrep(
        new Point3d(-W * 0.585, spandrelOuterY - 0.035, spandrelBottom + 0.05),
        new Point3d(W * 0.585, spandrelOuterY + 0.025, spandrelTop - 0.05)));

      // Thermal curb is thin and aligned, not a big floating block.
      spandrel.Add(BoxBrep(
        new Point3d(-W * 0.58, corridorInnerY, ffl - 0.10),
        new Point3d(W * 0.58, spandrelOuterY, ffl + 0.38)));
    }

    // Glazing exactly fills between spandrel bands.
    for (int i = 0; i < Levels; i++)
    {
      double sillZ = i * FloorH + spandrelUp;
      double headZ = (i + 1) * FloorH - spandrelDown;

      glazing.Add(BoxBrep(
        new Point3d(-W * 0.54, spandrelOuterY + 0.035, sillZ),
        new Point3d(W * 0.54, structureFaceY + 0.105, headZ)));

      glazing.Add(BoxBrep(new Point3d(-W * 0.55, spandrelOuterY, sillZ - 0.05), new Point3d(W * 0.55, structureFaceY + 0.16, sillZ + 0.05)));
      glazing.Add(BoxBrep(new Point3d(-W * 0.55, spandrelOuterY, headZ - 0.05), new Point3d(W * 0.55, structureFaceY + 0.16, headZ + 0.05)));

      for (int m = 0; m <= 5; m++)
      {
        double x = -W * 0.54 + W * 1.08 * m / 5.0;
        glazing.Add(BoxBrep(
          new Point3d(x - 0.035, spandrelOuterY, sillZ),
          new Point3d(x + 0.035, structureFaceY + 0.16, headZ)));
      }

      double midZ = sillZ + (headZ - sillZ) * 0.50;
      glazing.Add(BoxBrep(new Point3d(-W * 0.55, spandrelOuterY, midZ - 0.030), new Point3d(W * 0.55, structureFaceY + 0.16, midZ + 0.030)));
    }

    // Corridor structure: its own aligned deck, inner ledger, joists, and edge beam.
    for (int i = 0; i <= Levels; i++)
    {
      double deckTop = i * FloorH - corridorDrop;
      double deckBottom = deckTop - corridorDeckThick;
      double beamBottom = deckTop - corridorBeamDepth;

      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, corridorOuterY, deckBottom),
        new Point3d(W * 0.62, corridorInnerY, deckTop)));

      // Inner ledger and outer edge beam sit directly under the deck edges.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, corridorInnerY - 0.18, beamBottom),
        new Point3d(W * 0.62, corridorInnerY, deckBottom)));
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, corridorOuterY, beamBottom),
        new Point3d(W * 0.62, corridorOuterY + 0.34, deckBottom)));

      for (int b = 0; b <= 4; b++)
      {
        double x = -W * 0.55 + W * 1.10 * b / 4.0;
        corridor.Add(BoxBrep(
          new Point3d(x - 0.13, corridorOuterY + 0.10, beamBottom),
          new Point3d(x + 0.13, corridorInnerY - 0.10, deckBottom)));

        // Tie-back plate to the thermal curb/slab edge.
        corridor.Add(BoxBrep(
          new Point3d(x - 0.10, corridorInnerY - 0.10, beamBottom + 0.04),
          new Point3d(x + 0.10, spandrelOuterY + 0.02, deckBottom + 0.02)));
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

    // Roof.
    double roofFfl = totalH;
    roof.Add(BoxBrep(new Point3d(-W * 0.58, structureFaceY, roofFfl), new Point3d(W * 0.58, interiorDepth, roofFfl + cltThick)));
    roof.Add(BoxBrep(new Point3d(-W * 0.58, structureFaceY, roofFfl + cltThick), new Point3d(W * 0.58, interiorDepth, roofFfl + cltThick + 0.44)));
    roof.Add(BoxBrep(new Point3d(-W * 0.64, spandrelOuterY - 0.05, roofFfl + 0.24), new Point3d(W * 0.64, structureFaceY + 0.18, roofFfl + 1.22)));
    roof.Add(BoxBrep(new Point3d(-W * 0.68, spandrelOuterY - 0.12, roofFfl + 1.22), new Point3d(W * 0.68, structureFaceY + 0.30, roofFfl + 1.36)));

    // Armature: posts/rails supported off corridor edge beam.
    AddPipeRect(armature, -W * 0.68, armatureY, 0.0, W * 0.68, armatureY, totalH, postR);

    for (int m = 0; m <= 4; m++)
    {
      double x = -W * 0.60 + W * 1.20 * m / 4.0;
      armature.Add(CylinderBetween(new Point3d(x, armatureY, 0.0), new Point3d(x, armatureY, totalH), postR));

      for (int i = 0; i <= Levels; i++)
      {
        double deckTop = i * FloorH - corridorDrop;
        double beamZ = deckTop - corridorBeamDepth * 0.55;

        armature.Add(BoxBrep(
          new Point3d(x - 0.20, corridorOuterY + 0.06, beamZ - 0.04),
          new Point3d(x + 0.20, corridorOuterY + 0.30, beamZ + 0.08)));
        armature.Add(CylinderBetween(
          new Point3d(x, corridorOuterY + 0.18, beamZ),
          new Point3d(x, armatureY, beamZ),
          0.055));
      }
    }

    for (int i = 0; i <= Levels; i++)
    {
      double z = i * FloorH;
      armature.Add(CylinderBetween(new Point3d(-W * 0.68, armatureY, z), new Point3d(W * 0.68, armatureY, z), railR));
    }

    for (int i = 0; i < Levels; i++)
    {
      double z = i * FloorH + FloorH * 0.48;
      armature.Add(CylinderBetween(new Point3d(-W * 0.66, armatureY, z), new Point3d(W * 0.66, armatureY, z), railR));
    }

    // Mesh infill: connected diamond members share endpoints.
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

    // Organic pocket modules.
    var random = new Random(Seed);
    double bayStep = W / PlantersPerLevel;
    for (int level = 0; level < Levels; level++)
    {
      double railZ = level * FloorH + FloorH * 0.48;

      for (int j = 0; j < PlantersPerLevel; j++)
      {
        double baseX = -W * 0.5 + bayStep * (j + 0.5);
        double x = baseX + (random.NextDouble() - 0.5) * bayStep * 0.30 * Organic;
        double z = railZ + (random.NextDouble() - 0.5) * FloorH * 0.16 * Organic;
        double width = bayStep * PlanterScale * (0.58 + random.NextDouble() * 0.20 * Organic);
        double height = FloorH * PlanterScale * (0.18 + random.NextDouble() * 0.06 * Organic);
        double depth = PlanterScale * (1.10 + random.NextDouble() * 0.35 * Organic);
        double shellT = 0.12 * PlanterScale;
        Point3d pc = new Point3d(x, armatureY - 0.14, z);

        pockets.Add(OrganicPocketBasin(pc, width, height, depth, shellT, Organic, Seed + level * 41 + j * 17));
        pockets.Add(BackSpine(pc, width, height, shellT, armatureY));

        List<Point3d> lipPts = PocketLipPoints(pc, width, height, depth, Organic, Seed + j * 13);
        for (int l = 0; l < lipPts.Count - 1; l++)
          pockets.Add(CylinderBetween(lipPts[l], lipPts[l + 1], Math.Max(0.080, shellT * 0.62)));

        pockets.Add(SoilSurfaceMesh(pc, width * 0.58, depth * 0.64, pc.Z + height * 0.22, pc.Y - depth * 0.64));
        foreach (Curve rib in PocketRibCurves(pc, width, height, depth, Organic, Seed + j * 19)) pockets.Add(rib);
        foreach (Curve hole in DrainHoleCurves(pc, width, height, depth)) pockets.Add(hole);

        // Bracket: rail clamp + back plate + two arms. It connects to armature rail, not mesh.
        pocketSupports.Add(BoxBrep(new Point3d(pc.X - width * 0.32, armatureY - 0.09, railZ - 0.075), new Point3d(pc.X + width * 0.32, armatureY + 0.09, railZ + 0.075)));
        pocketSupports.Add(BoxBrep(new Point3d(pc.X - width * 0.30, armatureY + 0.07, pc.Z - height * 0.16), new Point3d(pc.X + width * 0.30, armatureY + 0.24, pc.Z + height * 0.16)));
        pocketSupports.Add(CylinderBetween(new Point3d(pc.X - width * 0.23, armatureY + 0.10, pc.Z - height * 0.10), new Point3d(pc.X - width * 0.23, armatureY + 0.52, pc.Z - height * 0.10), 0.060));
        pocketSupports.Add(CylinderBetween(new Point3d(pc.X + width * 0.23, armatureY + 0.10, pc.Z - height * 0.10), new Point3d(pc.X + width * 0.23, armatureY + 0.52, pc.Z - height * 0.10), 0.060));

        // Drip line.
        List<Point3d> drip = new List<Point3d>();
        drip.Add(new Point3d(pc.X - width * 0.25, pc.Y - depth * 0.54, pc.Z + height * 0.22));
        drip.Add(new Point3d(pc.X - width * 0.08, pc.Y - depth * 0.66, pc.Z + height * 0.24));
        drip.Add(new Point3d(pc.X + width * 0.10, pc.Y - depth * 0.65, pc.Z + height * 0.22));
        drip.Add(new Point3d(pc.X + width * 0.25, pc.Y - depth * 0.54, pc.Z + height * 0.23));
        for (int q = 0; q < drip.Count - 1; q++) pockets.Add(CylinderBetween(drip[q], drip[q + 1], 0.025));

        for (int k = 0; k < 7; k++)
        {
          double px = pc.X + (random.NextDouble() - 0.5) * width * 0.52;
          double py = pc.Y - depth * (0.54 + random.NextDouble() * 0.18);
          double pz = pc.Z + height * 0.18;
          double rise = 0.45 + random.NextDouble() * 1.05;

          plants.Add(new ArcCurve(new Arc(
            new Point3d(px, py, pz),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.35, py - 0.10, pz + rise * 0.55),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.65, py - 0.04, pz + rise))));

          var vine = new Polyline();
          vine.Add(new Point3d(px, py, pz));
          vine.Add(new Point3d(px + 0.16 * Math.Sin(k + Seed), pc.Y - depth * 0.20, pz + rise * 0.76));
          vine.Add(new Point3d(px + 0.30 * Math.Cos(k), meshY, pz + rise * 1.20));
          plants.Add(vine.ToNurbsCurve());
        }
      }
    }

    Print("Generated V7: aligned building structure, organic pockets, rail-supported brackets.");

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
      new Point3d(c.X - w * 0.25, armatureY - 0.02, c.Z - h * 0.34),
      new Point3d(c.X + w * 0.25, armatureY + Math.Max(0.22, t * 1.6), c.Z + h * 0.34));
  }

  Mesh OrganicPocketBasin(Point3d c, double w, double h, double d, double t, double organic, int seed)
  {
    int uCount = 34;
    int vCount = 18;
    var mesh = new Mesh();

    // Outer basin surface: deep belly, open top, thick sides.
    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;
      double zNorm = (tv - 0.5) * 2.0;
      double bowl = Math.Sin(tv * Math.PI);
      double topFlare = SmoothStep(0.50, 1.0, tv);
      double widthFactor = 0.42 + 0.42 * bowl + 0.32 * topFlare;

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double xNorm = (tu - 0.5) * 2.0;
        double side = 1.0 - Math.Abs(xNorm) * 0.10;
        double wave = Math.Sin(tu * Math.PI * 2.0 + seed * 0.10) * Math.Sin(tv * Math.PI * 1.7 + seed * 0.08);

        double x = c.X + xNorm * w * 0.5 * widthFactor;
        double z = c.Z + zNorm * h * 0.5 + wave * h * 0.050 * organic;
        double y = c.Y - d * (0.08 + 0.98 * Math.Pow(bowl, 0.72) * side) + wave * d * 0.075 * organic;
        mesh.Vertices.Add(x, y, z);
      }
    }

    int outerCount = mesh.Vertices.Count;

    // Inner surface; shifted back toward armature, making actual shell thickness.
    for (int v = 0; v <= vCount; v++)
    {
      for (int u = 0; u <= uCount; u++)
      {
        Point3f p = mesh.Vertices[v * (uCount + 1) + u];
        double tu = (double)u / uCount;
        double tv = (double)v / vCount;
        double shrinkX = (tu - 0.5) * w * 0.050;
        double shrinkZ = (tv - 0.5) * h * 0.060;
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

    // Close bottom and side cheeks. Leave top open as a real pocket.
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
      mesh.Vertices.Add(c.X + Math.Cos(t) * w * 0.5, y + Math.Sin(t) * d * 0.34, z + Math.Sin(t * 3.0) * 0.018);
    }
    for (int i = 1; i <= segments; i++) mesh.Faces.AddFace(0, i, i + 1);
    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  List<Point3d> PocketLipPoints(Point3d c, double w, double h, double d, double organic, int seed)
  {
    var pts = new List<Point3d>();
    for (int i = 0; i <= 22; i++)
    {
      double tu = (double)i / 22;
      double xNorm = (tu - 0.5) * 2.0;
      double x = c.X + xNorm * w * 0.60;
      double y = c.Y - d * (0.24 + 0.15 * (1.0 - Math.Abs(xNorm)));
      double z = c.Z + h * 0.52 + Math.Sin(tu * Math.PI * 2.0 + seed) * h * 0.035 * organic;
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
      for (int i = 0; i <= 28; i++)
      {
        double tu = (double)i / 28;
        double xNorm = (tu - 0.5) * 2.0;
        double bowl = Math.Sin(tv * Math.PI);
        double widthFactor = 0.44 + 0.42 * bowl;
        double wave = Math.Sin(tu * Math.PI * 2.0 + seed * 0.11) * 0.040 * organic;
        double x = c.X + xNorm * w * 0.5 * widthFactor;
        double y = c.Y - d * (0.16 + 0.82 * Math.Pow(bowl, 0.75) * (1.0 - Math.Abs(xNorm) * 0.10));
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
      double z = c.Z - h * 0.31;
      double y = c.Y - d * 0.78;
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
