// Grasshopper Script Instance
// V4: corrected section logic + true pocket modules
//
// Inputs:
// W double, FloorH double, Levels int, CorridorD double, MeshGap double,
// PlantersPerLevel int, PlanterScale double, Organic double, Seed int
//
// Outputs, keep all output type hints as Generic / No Type Hint:
// Corridor, OuterScreen, Planters, Plants, Brackets, Glazing

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
    Section logic:
    - Interior CLT slab stops at facade edge beam.
    - Glazing sits between slabs on sill curb/head track.
    - Corridor deck is separate exterior structure, slightly lower than interior FFL.
    - Thermal break / waterproof upstand closes the gap.
    - Pockets are true open thick shells with soil volume and a back mounting spine.
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
    ref object Corridor,
    ref object OuterScreen,
    ref object Planters,
    ref object Plants,
    ref object Brackets,
    ref object Glazing)
  {
    W = Math.Max(W, 10.0);
    FloorH = Math.Max(FloorH, 9.0);
    Levels = Math.Max(Levels, 1);
    CorridorD = Math.Max(CorridorD, 3.0);
    MeshGap = Math.Max(MeshGap, 0.8);
    PlantersPerLevel = Math.Max(PlantersPerLevel, 1);
    PlanterScale = Math.Max(PlanterScale, 0.65);
    Organic = Math.Max(0.0, Math.Min(Organic, 1.0));

    var corridor = new List<object>();
    var screen = new List<object>();
    var planters = new List<object>();
    var plants = new List<object>();
    var brackets = new List<object>();
    var glazing = new List<object>();

    double totalH = Levels * FloorH;

    // Section datum.
    double facadeLineY = 0.0;
    double interiorY0 = 0.18;
    double interiorDepth = 7.2;
    double thermalBreakD = 0.42;
    double corridorInnerY = -thermalBreakD;
    double corridorOuterY = -thermalBreakD - CorridorD;
    double armatureY = corridorOuterY - MeshGap;

    double cltThick = 0.58;       // 7 in CLT
    double edgeBeamDepth = 1.05;
    double edgeBeamWidth = 0.55;
    double corridorDeckThick = 0.30;
    double corridorDrop = 0.12;   // exterior deck sits slightly lower for drainage
    double joistDepth = 0.62;
    double pipeR = 0.035;
    double framePipeR = 0.065;

    // Floors and roof.
    for (int i = 0; i <= Levels; i++)
    {
      double ffl = i * FloorH;
      double extDeckTop = ffl - corridorDrop;

      // Interior CLT slab. Its edge stops behind the facade line.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.58, interiorY0, ffl - cltThick),
        new Point3d(W * 0.58, interiorDepth, ffl)));

      // Facade edge beam under slab edge, continuous along the bay.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.60, interiorY0 - edgeBeamWidth, ffl - cltThick - edgeBeamDepth),
        new Point3d(W * 0.60, interiorY0, ffl - cltThick)));

      // Perpendicular CLT rib/secondary beams framing into the facade edge beam.
      for (int b = 0; b <= 4; b++)
      {
        double x = -W * 0.55 + W * 1.10 * b / 4.0;
        corridor.Add(BoxBrep(
          new Point3d(x - 0.18, interiorY0 + 0.10, ffl - cltThick - 0.42),
          new Point3d(x + 0.18, interiorDepth, ffl - cltThick)));
        // Simple hanger/knife plate at beam-to-edge-beam connection.
        brackets.Add(BoxBrep(
          new Point3d(x - 0.16, interiorY0 - 0.08, ffl - cltThick - 0.36),
          new Point3d(x + 0.16, interiorY0 + 0.08, ffl - cltThick - 0.05)));
      }

      // Thermal break / waterproof curb / sill pan zone.
      brackets.Add(BoxBrep(
        new Point3d(-W * 0.58, corridorInnerY, ffl - 0.10),
        new Point3d(W * 0.58, facadeLineY + 0.10, ffl + 0.55)));

      // Separate exterior corridor deck, stopped outside the thermal break.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, corridorOuterY, extDeckTop - corridorDeckThick),
        new Point3d(W * 0.62, corridorInnerY - 0.08, extDeckTop)));

      // Corridor edge beam and subtle drip edge.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, corridorOuterY - 0.25, extDeckTop - joistDepth),
        new Point3d(W * 0.62, corridorOuterY + 0.10, extDeckTop - corridorDeckThick)));
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, corridorOuterY - 0.32, extDeckTop - 0.10),
        new Point3d(W * 0.62, corridorOuterY - 0.26, extDeckTop + 0.02)));
    }

    // Corridor joists and guardrails per level.
    for (int i = 0; i < Levels; i++)
    {
      double ffl = i * FloorH;
      double extDeckTop = ffl - corridorDrop;
      double railZ = extDeckTop + 3.55;

      for (int b = 0; b <= 4; b++)
      {
        double x = -W * 0.55 + W * 1.10 * b / 4.0;
        corridor.Add(BoxBrep(
          new Point3d(x - 0.14, corridorOuterY, extDeckTop - joistDepth),
          new Point3d(x + 0.14, corridorInnerY - 0.05, extDeckTop - corridorDeckThick)));

        corridor.Add(BoxBrep(
          new Point3d(x - 0.045, corridorOuterY - 0.07, extDeckTop + 0.08),
          new Point3d(x + 0.045, corridorOuterY + 0.07, railZ)));
      }

      corridor.Add(CylinderBetween(new Point3d(-W * 0.62, corridorOuterY, railZ), new Point3d(W * 0.62, corridorOuterY, railZ), 0.055));
      corridor.Add(CylinderBetween(new Point3d(-W * 0.62, corridorOuterY, extDeckTop + 1.85), new Point3d(W * 0.62, corridorOuterY, extDeckTop + 1.85), 0.038));
    }

    // Continuous glazing between slab zones. No doors.
    for (int i = 0; i < Levels; i++)
    {
      double ffl = i * FloorH;
      double sillZ = ffl + 0.62;
      double headZ = (i + 1) * FloorH - cltThick - 0.35;

      glazing.Add(BoxBrep(
        new Point3d(-W * 0.54, -0.035, sillZ),
        new Point3d(W * 0.54, 0.10, headZ)));

      // Sill and head tracks make the glazing relationship readable.
      glazing.Add(BoxBrep(new Point3d(-W * 0.55, -0.12, sillZ - 0.12), new Point3d(W * 0.55, 0.18, sillZ + 0.04)));
      glazing.Add(BoxBrep(new Point3d(-W * 0.55, -0.12, headZ - 0.04), new Point3d(W * 0.55, 0.18, headZ + 0.12)));

      for (int m = 0; m <= 5; m++)
      {
        double x = -W * 0.54 + W * 1.08 * m / 5.0;
        glazing.Add(BoxBrep(
          new Point3d(x - 0.035, -0.10, sillZ),
          new Point3d(x + 0.035, 0.18, headZ)));
      }

      double midZ = sillZ + (headZ - sillZ) * 0.52;
      glazing.Add(BoxBrep(new Point3d(-W * 0.55, -0.10, midZ - 0.032), new Point3d(W * 0.55, 0.18, midZ + 0.032)));
    }

    // Roof finish: CLT roof + tapered insulation/membrane + parapet/coping.
    double roofZ = totalH;
    corridor.Add(BoxBrep(new Point3d(-W * 0.58, interiorY0, roofZ), new Point3d(W * 0.58, interiorDepth, roofZ + 0.58)));
    corridor.Add(BoxBrep(new Point3d(-W * 0.58, interiorY0, roofZ + 0.58), new Point3d(W * 0.58, interiorDepth, roofZ + 1.05)));
    corridor.Add(BoxBrep(new Point3d(-W * 0.62, corridorInnerY - 0.08, roofZ + 0.20), new Point3d(W * 0.62, facadeLineY + 0.18, roofZ + 1.25)));
    corridor.Add(BoxBrep(new Point3d(-W * 0.66, corridorInnerY - 0.16, roofZ + 1.25), new Point3d(W * 0.66, facadeLineY + 0.30, roofZ + 1.38)));

    // Outer armature and pipe-modeled mesh.
    AddPipeRect(screen, -W * 0.68, armatureY, 0.0, W * 0.68, armatureY, totalH, framePipeR);
    for (int m = 0; m <= 4; m++)
    {
      double x = -W * 0.60 + W * 1.20 * m / 4.0;
      screen.Add(CylinderBetween(new Point3d(x, armatureY, 0.0), new Point3d(x, armatureY, totalH), framePipeR));
    }
    for (int i = 0; i <= Levels; i++)
      screen.Add(CylinderBetween(new Point3d(-W * 0.68, armatureY, i * FloorH), new Point3d(W * 0.68, armatureY, i * FloorH), framePipeR));

    double dx = W / 6.0;
    double dz = FloorH / 3.0;
    for (double x = -W * 0.66; x <= W * 0.66; x += dx)
    {
      for (double z = 0.10; z <= totalH - dz; z += dz)
      {
        Point3d a = new Point3d(x, armatureY, z);
        Point3d b = new Point3d(x + dx * 0.5, armatureY, z + dz * 0.5);
        Point3d c = new Point3d(x, armatureY, z + dz);
        Point3d d = new Point3d(x - dx * 0.5, armatureY, z + dz * 0.5);
        screen.Add(CylinderBetween(a, b, pipeR));
        screen.Add(CylinderBetween(b, c, pipeR));
        screen.Add(CylinderBetween(c, d, pipeR));
        screen.Add(CylinderBetween(d, a, pipeR));
      }
    }

    // True pockets: open, thick, basin-like modules.
    var random = new Random(Seed);
    double bayStep = W / PlantersPerLevel;

    for (int level = 0; level < Levels; level++)
    {
      for (int j = 0; j < PlantersPerLevel; j++)
      {
        double x = -W * 0.5 + bayStep * (j + 0.5);
        double jitter = (random.NextDouble() - 0.5) * bayStep * 0.16 * Organic;
        double z = level * FloorH + FloorH * (0.48 + 0.08 * Math.Sin(j + level * 1.7));
        double width = bayStep * 0.68 * PlanterScale;
        double height = FloorH * 0.18 * PlanterScale;
        double depth = 0.82 * PlanterScale;
        double shellT = 0.11 * PlanterScale;
        Point3d pc = new Point3d(x + jitter, armatureY - 0.10, z);

        planters.Add(TruePocketShell(pc, width, height, depth, shellT, Organic, Seed + level * 41 + j * 17));
        planters.Add(BackSpine(pc, width, height, shellT, armatureY));

        List<Point3d> lipPts = PocketLipPoints(pc, width, height, depth, Organic, Seed + j * 13);
        for (int l = 0; l < lipPts.Count - 1; l++)
          planters.Add(CylinderBetween(lipPts[l], lipPts[l + 1], Math.Max(0.075, shellT * 0.55)));

        planters.Add(SoilSurfaceMesh(pc, width * 0.54, depth * 0.58, pc.Z + height * 0.18, pc.Y - depth * 0.56));

        foreach (Curve rib in PocketRibCurves(pc, width, height, depth, Organic, Seed + j * 19))
          planters.Add(rib);
        foreach (Curve hole in DrainHoleCurves(pc, width, height, depth))
          planters.Add(hole);

        // Mounting plate and arms connect pocket back to armature and corridor-side frame.
        brackets.Add(BoxBrep(new Point3d(pc.X - width * 0.30, armatureY + 0.08, pc.Z - height * 0.12), new Point3d(pc.X + width * 0.30, armatureY + 0.22, pc.Z + height * 0.16)));
        brackets.Add(CylinderBetween(new Point3d(pc.X - width * 0.24, armatureY + 0.10, pc.Z - height * 0.08), new Point3d(pc.X - width * 0.24, corridorOuterY + 0.18, pc.Z - height * 0.04), 0.06));
        brackets.Add(CylinderBetween(new Point3d(pc.X + width * 0.24, armatureY + 0.10, pc.Z - height * 0.08), new Point3d(pc.X + width * 0.24, corridorOuterY + 0.18, pc.Z - height * 0.04), 0.06));

        for (int b = 0; b < 4; b++)
        {
          double bx = pc.X + (b < 2 ? -width * 0.22 : width * 0.22);
          double bz = pc.Z + (b % 2 == 0 ? -height * 0.02 : height * 0.12);
          brackets.Add(CylinderBetween(new Point3d(bx, armatureY - 0.02, bz), new Point3d(bx, armatureY - 0.13, bz), 0.07));
        }

        // Drip tube and emitters sit inside the open pocket.
        List<Point3d> drip = new List<Point3d>();
        drip.Add(new Point3d(pc.X - width * 0.25, pc.Y - depth * 0.48, pc.Z + height * 0.20));
        drip.Add(new Point3d(pc.X - width * 0.08, pc.Y - depth * 0.56, pc.Z + height * 0.22));
        drip.Add(new Point3d(pc.X + width * 0.10, pc.Y - depth * 0.55, pc.Z + height * 0.20));
        drip.Add(new Point3d(pc.X + width * 0.25, pc.Y - depth * 0.48, pc.Z + height * 0.21));
        for (int q = 0; q < drip.Count - 1; q++)
          planters.Add(CylinderBetween(drip[q], drip[q + 1], 0.025));

        for (int e = 0; e < 3; e++)
        {
          double ex = pc.X - width * 0.17 + e * width * 0.17;
          planters.Add(CylinderBetween(new Point3d(ex, pc.Y - depth * 0.58, pc.Z + height * 0.20), new Point3d(ex, pc.Y - depth * 0.58, pc.Z + height * 0.08), 0.018));
        }

        for (int k = 0; k < 7; k++)
        {
          double px = pc.X + (random.NextDouble() - 0.5) * width * 0.50;
          double py = pc.Y - depth * (0.46 + random.NextDouble() * 0.16);
          double pz = pc.Z + height * 0.18;
          double rise = 0.45 + random.NextDouble() * 1.05;

          plants.Add(new ArcCurve(new Arc(
            new Point3d(px, py, pz),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.35, py - 0.10, pz + rise * 0.55),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.65, py - 0.04, pz + rise))));

          var vine = new Polyline();
          vine.Add(new Point3d(px, py, pz));
          vine.Add(new Point3d(px + 0.16 * Math.Sin(k + Seed), pc.Y - depth * 0.18, pz + rise * 0.76));
          vine.Add(new Point3d(px + 0.30 * Math.Cos(k), armatureY + 0.03, pz + rise * 1.20));
          plants.Add(vine.ToNurbsCurve());
        }
      }
    }

    Print("Generated V4 corrected section + true pockets.");

    Corridor = corridor;
    OuterScreen = screen;
    Planters = planters;
    Plants = plants;
    Brackets = brackets;
    Glazing = glazing;
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

    // Open front basin shell: outer surface.
    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;
      double zNorm = (tv - 0.5) * 2.0;
      double bowl = Math.Sin(tv * Math.PI);
      double topFlare = SmoothStep(0.55, 1.0, tv);
      double widthFactor = 0.50 + 0.38 * bowl + 0.22 * topFlare;

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double xNorm = (tu - 0.5) * 2.0;
        double side = 1.0 - Math.Abs(xNorm) * 0.16;
        double wave = Math.Sin(tu * Math.PI * 2.0 + seed * 0.10) * Math.Sin(tv * Math.PI * 1.8 + seed * 0.08);

        double x = c.X + xNorm * w * 0.5 * widthFactor;
        double z = c.Z + zNorm * h * 0.5 + wave * h * 0.045 * organic;
        double y = c.Y - d * (0.10 + 0.86 * bowl * side) + wave * d * 0.075 * organic;
        mesh.Vertices.Add(x, y, z);
      }
    }

    int outerCount = mesh.Vertices.Count;

    // Inner surface shifted upward/backward to make an actual thick pocket.
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

        int ai = outerCount + a;
        int bi = outerCount + b;
        int ci = outerCount + c0;
        int di = outerCount + d0;
        mesh.Faces.AddFace(ai, ci, di, bi);
      }
    }

    // Close sides and bottom, leave the top visually open with lip/soil.
    for (int u = 0; u < uCount; u++)
    {
      int bottom = u;
      mesh.Faces.AddFace(bottom, bottom + 1, outerCount + bottom + 1, outerCount + bottom);
    }
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
    for (int i = 1; i <= segments; i++)
      mesh.Faces.AddFace(0, i, i + 1);
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
      double x = c.X + xNorm * w * 0.55;
      double y = c.Y - d * (0.18 + 0.10 * (1.0 - Math.Abs(xNorm)));
      double z = c.Z + h * 0.50 + Math.Sin(tu * Math.PI * 2.0 + seed) * h * 0.030 * organic;
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
        double widthFactor = 0.54 + 0.34 * bowl;
        double wave = Math.Sin(tu * Math.PI * 2.0 + seed * 0.11) * 0.040 * organic;
        double x = c.X + xNorm * w * 0.5 * widthFactor;
        double y = c.Y - d * (0.16 + 0.70 * bowl * (1.0 - Math.Abs(xNorm) * 0.18));
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
      double y = c.Y - d * 0.66;
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
