// Grasshopper Script Instance
// V8: datum-first computational facade bay
//
// Inputs:
// W double, FloorH double, Levels int, CorridorD double, MeshGap double,
// PlantersPerLevel int, PlanterScale double, Organic double, Seed int
//
// Outputs, in this exact order. Keep ALL output type hints as Generic / No Type Hint:
// SectionGuides
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
    ref object SectionGuides,
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

    var guides = new List<object>();
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

    // --------------------------
    // ONE SECTION COORDINATE SYSTEM
    // --------------------------
    // Positive Y = interior. Negative Y = exterior.
    // Every system below derives from these datums.
    double xL = -W * 0.5;
    double xR = W * 0.5;
    double bayL = -W * 0.62;
    double bayR = W * 0.62;

    double structureFaceY = 0.0;             // exterior face of CLT slab + edge beam
    double interiorDepth = 7.2;
    double envelopeOuterY = -0.18;           // exterior face of spandrel/glazing cover
    double thermalGap = 0.44;
    double corridorInnerY = envelopeOuterY - thermalGap;
    double corridorOuterY = corridorInnerY - CorridorD;
    double armatureY = corridorOuterY - MeshGap;
    double meshY = armatureY - 0.04;

    double cltT = 0.58;                      // 7 in CLT
    double edgeBeamD = 1.00;
    double edgeBeamInward = 0.68;            // beam extends inward only
    double spandrelAboveFFL = 0.70;
    double spandrelBelowFFL = cltT + edgeBeamD + 0.16;
    double deckDrop = 0.12;
    double deckT = 0.30;
    double corridorBeamD = 0.64;

    double postR = 0.075;
    double railR = 0.058;
    double meshR = 0.023;
    double totalH = Levels * FloorH;

    // Section guide lines first. Turn this output on/off while debugging.
    AddSectionGuide(guides, "structure face", structureFaceY, 0, Levels * FloorH);
    AddSectionGuide(guides, "envelope face", envelopeOuterY, 0, Levels * FloorH);
    AddSectionGuide(guides, "corridor inner", corridorInnerY, 0, Levels * FloorH);
    AddSectionGuide(guides, "corridor outer", corridorOuterY, 0, Levels * FloorH);
    AddSectionGuide(guides, "armature plane", armatureY, 0, Levels * FloorH);

    for (int i = 0; i <= Levels; i++)
    {
      double ffl = i * FloorH;
      guides.Add(new LineCurve(new Point3d(xL, envelopeOuterY - 0.3, ffl), new Point3d(xR, interiorDepth, ffl)));
      guides.Add(new LineCurve(new Point3d(xL, envelopeOuterY - 0.3, ffl + spandrelAboveFFL), new Point3d(xR, interiorDepth, ffl + spandrelAboveFFL)));
      guides.Add(new LineCurve(new Point3d(xL, envelopeOuterY - 0.3, ffl - spandrelBelowFFL), new Point3d(xR, interiorDepth, ffl - spandrelBelowFFL)));
    }

    // --------------------------
    // PRIMARY STRUCTURE + SPANDREL
    // --------------------------
    for (int i = 0; i <= Levels; i++)
    {
      double ffl = i * FloorH;
      double slabTop = ffl;
      double slabBottom = ffl - cltT;
      double beamTop = slabBottom;
      double beamBottom = beamTop - edgeBeamD;
      double spZ0 = ffl - spandrelBelowFFL;
      double spZ1 = ffl + spandrelAboveFFL;

      // CLT slab and edge beam share the same exterior face: structureFaceY.
      primary.Add(BoxBrep(new Point3d(bayL, structureFaceY, slabBottom), new Point3d(bayR, interiorDepth, slabTop)));
      primary.Add(BoxBrep(new Point3d(bayL, structureFaceY, beamBottom), new Point3d(bayR, structureFaceY + edgeBeamInward, beamTop)));

      // Perpendicular ribs stop at the inner face of edge beam.
      for (int b = 0; b <= 4; b++)
      {
        double x = bayL + (bayR - bayL) * b / 4.0;
        primary.Add(BoxBrep(new Point3d(x - 0.15, structureFaceY + edgeBeamInward, slabBottom - 0.40), new Point3d(x + 0.15, interiorDepth, slabBottom)));
        primary.Add(BoxBrep(new Point3d(x - 0.13, structureFaceY + 0.04, slabBottom - 0.38), new Point3d(x + 0.13, structureFaceY + edgeBeamInward + 0.04, slabBottom - 0.06)));
      }

      // Envelope is a thin wrapper at the exterior face, not a structural beam.
      spandrel.Add(BoxBrep(new Point3d(bayL - 0.03, envelopeOuterY, spZ0), new Point3d(bayR + 0.03, structureFaceY + 0.04, spZ1)));
      spandrel.Add(BoxBrep(new Point3d(bayL - 0.04, envelopeOuterY - 0.035, spZ0 + 0.06), new Point3d(bayR + 0.04, envelopeOuterY + 0.025, spZ1 - 0.06)));

      // Thin waterproof/thermal curb at the corridor threshold, aligned with FFL.
      spandrel.Add(BoxBrep(new Point3d(bayL, corridorInnerY, ffl - 0.08), new Point3d(bayR, envelopeOuterY, ffl + 0.36)));
    }

    // Glazing fills exactly between adjacent spandrel bands.
    for (int i = 0; i < Levels; i++)
    {
      double sillZ = i * FloorH + spandrelAboveFFL;
      double headZ = (i + 1) * FloorH - spandrelBelowFFL;

      glazing.Add(BoxBrep(new Point3d(xL, envelopeOuterY + 0.03, sillZ), new Point3d(xR, structureFaceY + 0.12, headZ)));
      glazing.Add(BoxBrep(new Point3d(xL - 0.05, envelopeOuterY, sillZ - 0.055), new Point3d(xR + 0.05, structureFaceY + 0.16, sillZ + 0.055)));
      glazing.Add(BoxBrep(new Point3d(xL - 0.05, envelopeOuterY, headZ - 0.055), new Point3d(xR + 0.05, structureFaceY + 0.16, headZ + 0.055)));

      for (int m = 0; m <= 5; m++)
      {
        double x = xL + W * m / 5.0;
        glazing.Add(BoxBrep(new Point3d(x - 0.035, envelopeOuterY, sillZ), new Point3d(x + 0.035, structureFaceY + 0.16, headZ)));
      }

      double midZ = (sillZ + headZ) * 0.5;
      glazing.Add(BoxBrep(new Point3d(xL - 0.05, envelopeOuterY, midZ - 0.028), new Point3d(xR + 0.05, structureFaceY + 0.16, midZ + 0.028)));
    }

    // --------------------------
    // CORRIDOR STRUCTURE
    // --------------------------
    for (int i = 0; i <= Levels; i++)
    {
      double deckTop = i * FloorH - deckDrop;
      double deckBottom = deckTop - deckT;
      double beamBottom = deckTop - corridorBeamD;

      // Deck.
      corridor.Add(BoxBrep(new Point3d(bayL, corridorOuterY, deckBottom), new Point3d(bayR, corridorInnerY, deckTop)));

      // Ledger and edge beam are flush under their deck edges.
      corridor.Add(BoxBrep(new Point3d(bayL, corridorInnerY - 0.20, beamBottom), new Point3d(bayR, corridorInnerY, deckBottom)));
      corridor.Add(BoxBrep(new Point3d(bayL, corridorOuterY, beamBottom), new Point3d(bayR, corridorOuterY + 0.34, deckBottom)));

      // Joists span cleanly between ledger and edge beam.
      for (int b = 0; b <= 4; b++)
      {
        double x = bayL + (bayR - bayL) * b / 4.0;
        corridor.Add(BoxBrep(new Point3d(x - 0.12, corridorOuterY + 0.16, beamBottom), new Point3d(x + 0.12, corridorInnerY - 0.14, deckBottom)));
        corridor.Add(BoxBrep(new Point3d(x - 0.10, corridorInnerY - 0.14, beamBottom + 0.04), new Point3d(x + 0.10, envelopeOuterY + 0.02, deckBottom + 0.02)));
      }
    }

    for (int i = 0; i < Levels; i++)
    {
      double deckTop = i * FloorH - deckDrop;
      double railZ = deckTop + 3.55;

      for (int b = 0; b <= 4; b++)
      {
        double x = bayL + (bayR - bayL) * b / 4.0;
        corridor.Add(BoxBrep(new Point3d(x - 0.04, corridorOuterY - 0.06, deckTop + 0.08), new Point3d(x + 0.04, corridorOuterY + 0.06, railZ)));
      }

      corridor.Add(CylinderBetween(new Point3d(bayL, corridorOuterY, railZ), new Point3d(bayR, corridorOuterY, railZ), 0.050));
      corridor.Add(CylinderBetween(new Point3d(bayL, corridorOuterY, deckTop + 1.85), new Point3d(bayR, corridorOuterY, deckTop + 1.85), 0.035));
    }

    // Roof assembly, aligned to the same structure face.
    double roofFfl = totalH;
    roof.Add(BoxBrep(new Point3d(bayL, structureFaceY, roofFfl), new Point3d(bayR, interiorDepth, roofFfl + cltT)));
    roof.Add(BoxBrep(new Point3d(bayL, structureFaceY, roofFfl + cltT), new Point3d(bayR, interiorDepth, roofFfl + cltT + 0.44)));
    roof.Add(BoxBrep(new Point3d(bayL - 0.06, envelopeOuterY - 0.05, roofFfl + 0.24), new Point3d(bayR + 0.06, structureFaceY + 0.18, roofFfl + 1.22)));
    roof.Add(BoxBrep(new Point3d(bayL - 0.10, envelopeOuterY - 0.12, roofFfl + 1.22), new Point3d(bayR + 0.10, structureFaceY + 0.30, roofFfl + 1.36)));

    // --------------------------
    // ARMATURE + MESH INFILL
    // --------------------------
    AddPipeRect(armature, bayL, armatureY, 0.0, bayR, armatureY, totalH, postR);

    for (int p = 0; p <= 4; p++)
    {
      double x = bayL + (bayR - bayL) * p / 4.0;
      armature.Add(CylinderBetween(new Point3d(x, armatureY, 0.0), new Point3d(x, armatureY, totalH), postR));

      for (int i = 0; i <= Levels; i++)
      {
        double deckTop = i * FloorH - deckDrop;
        double beamZ = deckTop - corridorBeamD * 0.55;
        armature.Add(BoxBrep(new Point3d(x - 0.20, corridorOuterY + 0.06, beamZ - 0.04), new Point3d(x + 0.20, corridorOuterY + 0.30, beamZ + 0.08)));
        armature.Add(CylinderBetween(new Point3d(x, corridorOuterY + 0.18, beamZ), new Point3d(x, armatureY, beamZ), 0.055));
      }
    }

    for (int i = 0; i <= Levels; i++)
      armature.Add(CylinderBetween(new Point3d(bayL, armatureY, i * FloorH), new Point3d(bayR, armatureY, i * FloorH), railR));

    for (int i = 0; i < Levels; i++)
      armature.Add(CylinderBetween(new Point3d(bayL + 0.15, armatureY, i * FloorH + FloorH * 0.48), new Point3d(bayR - 0.15, armatureY, i * FloorH + FloorH * 0.48), railR));

    double cellX = W / 6.0;
    double cellZ = FloorH / 3.0;
    for (double x = bayL; x <= bayR; x += cellX)
    {
      for (double z = 0.0; z <= totalH - cellZ; z += cellZ)
      {
        Point3d a = new Point3d(x, meshY, z);
        Point3d b = new Point3d(x + cellX * 0.5, meshY, z + cellZ * 0.5);
        Point3d c = new Point3d(x, meshY, z + cellZ);
        Point3d d = new Point3d(x - cellX * 0.5, meshY, z + cellZ * 0.5);
        mesh.Add(CylinderBetween(a, b, meshR));
        mesh.Add(CylinderBetween(b, c, meshR));
        mesh.Add(CylinderBetween(c, d, meshR));
        mesh.Add(CylinderBetween(d, a, meshR));
      }
    }

    // --------------------------
    // ORGANIC POCKET MODULES
    // --------------------------
    var random = new Random(Seed);
    double bayStep = W / PlantersPerLevel;

    for (int level = 0; level < Levels; level++)
    {
      double supportRailZ = level * FloorH + FloorH * 0.48;

      for (int j = 0; j < PlantersPerLevel; j++)
      {
        double baseX = xL + bayStep * (j + 0.5);
        double x = baseX + (random.NextDouble() - 0.5) * bayStep * 0.28 * Organic;
        double z = supportRailZ + (random.NextDouble() - 0.5) * FloorH * 0.14 * Organic;

        double width = bayStep * PlanterScale * (0.56 + random.NextDouble() * 0.22 * Organic);
        double height = FloorH * PlanterScale * (0.20 + random.NextDouble() * 0.07 * Organic);
        double depth = PlanterScale * (1.25 + random.NextDouble() * 0.40 * Organic);
        double shellT = 0.13 * PlanterScale;

        Point3d pocketCenter = new Point3d(x, armatureY - 0.18, z);

        pockets.Add(OrganicPocketBasin(pocketCenter, width, height, depth, shellT, Organic, Seed + level * 41 + j * 17));
        pockets.Add(BackSpine(pocketCenter, width, height, shellT, armatureY));

        List<Point3d> lipPts = PocketLipPoints(pocketCenter, width, height, depth, Organic, Seed + j * 13);
        for (int l = 0; l < lipPts.Count - 1; l++)
          pockets.Add(CylinderBetween(lipPts[l], lipPts[l + 1], Math.Max(0.080, shellT * 0.62)));

        pockets.Add(SoilSurfaceMesh(pocketCenter, width * 0.60, depth * 0.68, pocketCenter.Z + height * 0.20, pocketCenter.Y - depth * 0.72));

        foreach (Curve rib in PocketRibCurves(pocketCenter, width, height, depth, Organic, Seed + j * 19))
          pockets.Add(rib);
        foreach (Curve hole in DrainHoleCurves(pocketCenter, width, height, depth))
          pockets.Add(hole);

        // Support is rail-mounted.
        pocketSupports.Add(BoxBrep(new Point3d(x - width * 0.32, armatureY - 0.09, supportRailZ - 0.075), new Point3d(x + width * 0.32, armatureY + 0.09, supportRailZ + 0.075)));
        pocketSupports.Add(BoxBrep(new Point3d(x - width * 0.30, armatureY + 0.07, z - height * 0.18), new Point3d(x + width * 0.30, armatureY + 0.25, z + height * 0.18)));
        pocketSupports.Add(CylinderBetween(new Point3d(x - width * 0.23, armatureY + 0.12, z - height * 0.10), new Point3d(x - width * 0.23, armatureY + 0.58, z - height * 0.10), 0.060));
        pocketSupports.Add(CylinderBetween(new Point3d(x + width * 0.23, armatureY + 0.12, z - height * 0.10), new Point3d(x + width * 0.23, armatureY + 0.58, z - height * 0.10), 0.060));

        // Drip tube follows the inside rim.
        List<Point3d> drip = new List<Point3d>();
        drip.Add(new Point3d(x - width * 0.25, pocketCenter.Y - depth * 0.60, z + height * 0.21));
        drip.Add(new Point3d(x - width * 0.08, pocketCenter.Y - depth * 0.74, z + height * 0.23));
        drip.Add(new Point3d(x + width * 0.10, pocketCenter.Y - depth * 0.73, z + height * 0.21));
        drip.Add(new Point3d(x + width * 0.25, pocketCenter.Y - depth * 0.60, z + height * 0.22));
        for (int q = 0; q < drip.Count - 1; q++)
          pockets.Add(CylinderBetween(drip[q], drip[q + 1], 0.025));

        for (int k = 0; k < 7; k++)
        {
          double px = x + (random.NextDouble() - 0.5) * width * 0.52;
          double py = pocketCenter.Y - depth * (0.58 + random.NextDouble() * 0.20);
          double pz = z + height * 0.12;
          double rise = 0.45 + random.NextDouble() * 1.05;

          plants.Add(new ArcCurve(new Arc(
            new Point3d(px, py, pz),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.35, py - 0.10, pz + rise * 0.55),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.65, py - 0.04, pz + rise))));

          var vine = new Polyline();
          vine.Add(new Point3d(px, py, pz));
          vine.Add(new Point3d(px + 0.16 * Math.Sin(k + Seed), pocketCenter.Y - depth * 0.22, pz + rise * 0.76));
          vine.Add(new Point3d(px + 0.30 * Math.Cos(k), meshY, pz + rise * 1.20));
          plants.Add(vine.ToNurbsCurve());
        }
      }
    }

    Print("Generated V8 datum-first model.");

    SectionGuides = guides;
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

  void AddSectionGuide(List<object> target, string label, double y, double z0, double z1)
  {
    target.Add(new LineCurve(new Point3d(-0.35, y, z0), new Point3d(-0.35, y, z1)));
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

  void AddPipeRect(List<object> target, double x0, double y, double z0, double x1, double y1, double z1, double r)
  {
    Point3d a = new Point3d(x0, y, z0);
    Point3d b = new Point3d(x1, y, z0);
    Point3d c = new Point3d(x1, y, z1);
    Point3d d = new Point3d(x0, y, z1);
    target.Add(CylinderBetween(a, b, r));
    target.Add(CylinderBetween(b, c, r));
    target.Add(CylinderBetween(c, d, r));
    target.Add(CylinderBetween(d, a, r));
  }

  Brep BackSpine(Point3d c, double w, double h, double t, double armatureY)
  {
    return BoxBrep(
      new Point3d(c.X - w * 0.24, armatureY - 0.02, c.Z - h * 0.34),
      new Point3d(c.X + w * 0.24, armatureY + Math.Max(0.24, t * 1.7), c.Z + h * 0.34));
  }

  Mesh OrganicPocketBasin(Point3d c, double w, double h, double d, double t, double organic, int seed)
  {
    int uCount = 34;
    int vCount = 22;
    var mesh = new Mesh();

    // Section path creates a visible pocket:
    // back upper -> back lower -> deep rounded belly -> raised front lip.
    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;

      double ySection;
      double zSection;
      if (tv < 0.28)
      {
        double s = tv / 0.28;
        ySection = c.Y + 0.03;
        zSection = c.Z + h * (0.52 - 0.72 * s);
      }
      else if (tv < 0.72)
      {
        double s = (tv - 0.28) / 0.44;
        ySection = c.Y - d * (0.12 + 0.88 * SmoothStep(0.0, 1.0, s));
        zSection = c.Z - h * 0.20 - h * 0.18 * Math.Sin(s * Math.PI);
      }
      else
      {
        double s = (tv - 0.72) / 0.28;
        ySection = c.Y - d * (1.00 - 0.12 * s);
        zSection = c.Z - h * 0.26 + h * 0.78 * SmoothStep(0.0, 1.0, s);
      }

      double widthFactor = 0.46 + 0.36 * Math.Sin(tv * Math.PI) + 0.18 * SmoothStep(0.65, 1.0, tv);

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double xNorm = (tu - 0.5) * 2.0;
        double wave = Math.Sin(tu * Math.PI * 2.2 + seed * 0.13) * Math.Sin(tv * Math.PI * 1.8 + seed * 0.07);

        double x = c.X + xNorm * w * 0.5 * widthFactor;
        double y = ySection + wave * d * 0.055 * organic;
        double z = zSection + wave * h * 0.045 * organic;
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
        mesh.Vertices.Add(p.X - (tu - 0.5) * w * 0.05, p.Y + t, p.Z);
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

    // Close sides and bottom/back edge, leave top opening.
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
    int segments = 32;
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
    for (int i = 0; i <= 24; i++)
    {
      double tu = (double)i / 24;
      double xNorm = (tu - 0.5) * 2.0;
      double x = c.X + xNorm * w * 0.62;
      double y = c.Y - d * (0.88 + 0.12 * (1.0 - Math.Abs(xNorm)));
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
      double s = 0.30 + r * 0.13;
      var pl = new Polyline();
      for (int i = 0; i <= 28; i++)
      {
        double tu = (double)i / 28;
        double xNorm = (tu - 0.5) * 2.0;
        double widthFactor = 0.42 + 0.42 * Math.Sin(s * Math.PI);
        double x = c.X + xNorm * w * 0.5 * widthFactor;
        double y = c.Y - d * (0.18 + 0.72 * SmoothStep(0.0, 1.0, s));
        double z = c.Z - h * 0.24 + h * s + Math.Sin(tu * Math.PI * 2.0 + seed) * h * 0.035 * organic;
        pl.Add(new Point3d(x, y - 0.02, z));
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
      double z = c.Z - h * 0.34;
      double y = c.Y - d * 0.82;
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
