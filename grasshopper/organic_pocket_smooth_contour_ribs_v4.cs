// Grasshopper Script Instance
// Organic planter pocket - smooth contour rib version
//
// Rhino units: feet
//
// Inputs:
// W double                  // overall study width, e.g. 18
// FloorH double             // floor-to-floor height, e.g. 12
// Levels int                // e.g. 2 or 3
// PlantersPerLevel int      // e.g. 4, per row
// PlanterScale double       // e.g. 1.0
// Organic double            // 0 to 1, e.g. 0.75
// Seed int                  // e.g. 7
//
// Outputs:
// ContourBandSurfaces       // Brep, smooth modular contour band surfaces, inset 2 inches toward soil
// SmoothContourCurves       // Curve, clean contour loops for optional Pipe/Offset
// PocketGuideSurfaces       // Mesh, faint single-surface guide
// VaporBarrier              // Mesh, guide surface inset 0.75 inch toward soil with 0.1 inch inward thickness
// PocketSoils               // Mesh
// BackPlates                // Brep
// Hooks                     // Brep
// HookSlots                 // Brep, vertical adjustment slots on backplates
// Brackets                  // Brep
// DrainHoles                // Curve
// Plants                    // Mesh, low drooping planting ribbons
// PlantStems                // Brep, 0.25 inch diameter pipes from soil anchors to pocket lip
// Leaves                    // Mesh, small random leaf patches

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
    ref object ContourBandSurfaces,
    ref object SmoothContourCurves,
    ref object PocketGuideSurfaces,
    ref object VaporBarrier,
    ref object PocketSoils,
    ref object BackPlates,
    ref object Hooks,
    ref object HookSlots,
    ref object Brackets,
    ref object DrainHoles,
    ref object Plants,
    ref object PlantStems,
    ref object Leaves)
  {
    W = Math.Max(W, 8.0);
    FloorH = Math.Max(FloorH, 8.0);
    Levels = Math.Max(Levels, 1);
    PlantersPerLevel = Math.Max(PlantersPerLevel, 1);
    PlanterScale = Math.Max(PlanterScale, 0.35);
    Organic = Clamp(Organic, 0.0, 1.0);

    var bandSurfaces = new List<object>();
    var contourCurves = new List<object>();
    var guideSurfaces = new List<object>();
    var vaporBarriers = new List<object>();
    var soils = new List<object>();
    var backs = new List<object>();
    var hooks = new List<object>();
    var hookSlots = new List<object>();
    var brackets = new List<object>();
    var drains = new List<object>();
    var plants = new List<object>();
    var plantStems = new List<object>();
    var leaves = new List<object>();

    var random = new Random(Seed);
    double bayStep = W / PlantersPerLevel;
    double facadeY = 0.0;

    int rowsPerLevel = 2;

    for (int level = 0; level < Levels; level++)
    {
      for (int row = 0; row < rowsPerLevel; row++)
      {
        for (int j = 0; j < PlantersPerLevel; j++)
        {
          double u = PlantersPerLevel == 1 ? 0.5 : (double)j / (PlantersPerLevel - 1);
          double v = Levels == 1 ? 0.5 : (double)level / (Levels - 1);
          double rowT = rowsPerLevel == 1 ? 0.5 : (double)row / (rowsPerLevel - 1);

          double sizeBias =
            (0.82 + 0.24 * Math.Sin((u + 0.10) * Math.PI)) *
            (0.84 + 0.20 * Math.Sin((v + 0.16) * Math.PI)) *
            (0.92 + 0.10 * Math.Sin((rowT + 0.22) * Math.PI)) *
            (1.0 + 0.13 * Math.Sin(j * 1.71 + row * 0.61 + level * 0.83 + Seed * 0.13)) *
            (1.0 + (random.NextDouble() - 0.5) * 0.22 * Organic);

          double scale = PlanterScale * sizeBias;
          double x = -W * 0.5 + bayStep * (j + 0.5);
          x += (row == 0 ? -0.12 : 0.12) * bayStep;
          x += (random.NextDouble() - 0.5) * bayStep * 0.20 * Organic;

          // Two rows sit on a half-floor-height rhythm: 1/4 and 3/4 within each level.
          double rowCenter = (row + 0.5) / rowsPerLevel;
          double rowHookZ = level * FloorH + FloorH * rowCenter;
          double z = rowHookZ;

          double width = bayStep * (0.70 + 0.10 * Organic) * scale;
          double height = FloorH * (0.25 + 0.035 * Organic) * scale;
          double depth = (1.40 + 0.48 * Organic) * scale;

          PocketData pocket = MakePocket(
            new Point3d(x, facadeY, z),
            width,
            height,
            depth,
            rowHookZ,
            Organic,
            Seed + level * 97 + row * 53 + j * 31);

          foreach (Brep b in pocket.ContourBands) bandSurfaces.Add(b);
          foreach (Curve c in pocket.Contours) contourCurves.Add(c);
          guideSurfaces.Add(pocket.GuideSurface);
          vaporBarriers.Add(pocket.VaporBarrier);
          soils.Add(pocket.Soil);
          backs.Add(pocket.BackPlate);
          foreach (Brep b in pocket.Hooks) hooks.Add(b);
          foreach (Brep b in pocket.HookSlots) hookSlots.Add(b);
          foreach (Brep b in pocket.Brackets) brackets.Add(b);
          foreach (Curve c in pocket.DrainHoles) drains.Add(c);
          foreach (Mesh m in pocket.Plants) plants.Add(m);
          foreach (Brep b in pocket.PlantStems) plantStems.Add(b);
          foreach (Mesh m in pocket.Leaves) leaves.Add(m);
        }
      }
    }

    Print("Generated smooth contour pockets. Bands are single surfaces, inset 2 inches toward the soil side.");

    ContourBandSurfaces = bandSurfaces;
    SmoothContourCurves = contourCurves;
    PocketGuideSurfaces = guideSurfaces;
    VaporBarrier = vaporBarriers;
    PocketSoils = soils;
    BackPlates = backs;
    Hooks = hooks;
    HookSlots = hookSlots;
    Brackets = brackets;
    DrainHoles = drains;
    Plants = plants;
    PlantStems = plantStems;
    Leaves = leaves;
  }

  class PocketData
  {
    public List<Brep> ContourBands = new List<Brep>();
    public List<Curve> Contours = new List<Curve>();
    public Mesh GuideSurface;
    public Mesh VaporBarrier;
    public Mesh Soil;
    public Brep BackPlate;
    public List<Brep> Hooks = new List<Brep>();
    public List<Brep> HookSlots = new List<Brep>();
    public List<Brep> Brackets = new List<Brep>();
    public List<Curve> DrainHoles = new List<Curve>();
    public List<Mesh> Plants = new List<Mesh>();
    public List<Brep> PlantStems = new List<Brep>();
    public List<Mesh> Leaves = new List<Mesh>();
  }

  PocketData MakePocket(Point3d c, double width, double height, double depth, double rowHookZ, double organic, int seed)
  {
    var result = new PocketData();

    double printedLayerH = 1.0 / 12.0; // 1 inch in feet.
    int ribCount = Math.Max(8, (int)Math.Ceiling((height * 0.80) / printedLayerH) + 1);
    double contourStep = 1.0 / (ribCount - 1);

    for (int i = 0; i < ribCount; i++)
    {
      double t = ribCount == 1 ? 1.0 : (double)i / (ribCount - 1);
      double tCenter = t;
      Curve center = MakeContour(c, width, height, depth, tCenter, organic, seed);
      result.Contours.Add(center);

      // Each visible modular band is a single surface:
      // the contour is inset 2 inches toward the soil side, then extruded straight down one layer.
      if (i == 0) continue;

      double layerDrop = Math.Min(1.0 / 12.0, height * 0.80 * contourStep);
      Brep band = MakeContourBandSurface(
        c,
        width,
        height,
        depth,
        tCenter,
        2.0 / 12.0,
        layerDrop,
        organic,
        seed);

      if (band != null)
      {
        result.ContourBands.Add(band);
      }
    }

    result.GuideSurface = MakeGuideSurface(c, width, height, depth, organic, seed);
    result.VaporBarrier = MakeGuideShell(c, width, height, depth, organic, seed, 0.75 / 12.0, 0.10 / 12.0);

    double soilT = 3.0 / 4.0;
    result.Soil = MakeSoilFromContour(c, width, height, depth, soilT, 1.0 / 12.0, organic, seed);
    double soilZ = c.Z - height * 0.38 + height * 0.80 * soilT;

    AddBackPlateHooksAndSlots(result, c, width, height, depth, rowHookZ);

    AddBrackets(result, c, width, height, depth);
    AddDrainHoles(result, c, width, height, depth);
    AddPlants(result, c, width, height, depth, soilZ, organic, seed);
    return result;
  }

  Curve MakeContour(Point3d c, double width, double height, double depth, double t, double organic, int seed, double inset)
  {
    int count = 36;
    var pts = new List<Point3d>();

    double growth = 0.15 + 0.85 * SmoothStep(t);
    double halfW = width * 0.5 * growth;
    double d = depth * (0.13 + 0.87 * SmoothStep(t));
    double z = c.Z - height * 0.38 + height * 0.80 * t;

    // Superellipse section: closed, smooth, slightly squared at the back and round at the front.
    double n = 3.2 + organic * 0.8;
    double yCenter = c.Y - d * 0.50;

    for (int i = 0; i < count; i++)
    {
      double a = Math.PI * 2.0 * i / count;
      double ca = Math.Cos(a);
      double sa = Math.Sin(a);
      double sx = SignedPow(ca, 2.0 / n);
      double sy = SignedPow(sa, 2.0 / n);

      double frontBias = sy < 0.0 ? 1.0 + 0.10 * organic : 1.0 - 0.04 * organic;
      double x = c.X + sx * halfW;
      double y = yCenter + sy * d * 0.50 * frontBias;

      // Keep the back mounting side disciplined, but let the side/front lip breathe.
      if (sy > 0.72)
      {
        double k = (sy - 0.72) / 0.28;
        y = Lerp(y, c.Y - 0.035, Clamp(k, 0.0, 1.0));
      }

      double wave = Math.Sin(a * 3.0 + seed * 0.17) * Math.Sin(t * Math.PI);
      x += wave * width * 0.025 * organic;
      y += Math.Cos(a * 2.0 + seed * 0.11) * depth * 0.018 * organic * (1.0 - Math.Max(0.0, sy));

      if (inset > 0.0)
      {
        Vector3d inward = new Vector3d(c.X - x, yCenter - y, 0.0);
        if (inward.Length > 0.001)
        {
          inward.Unitize();
          x += inward.X * inset;
          y += inward.Y * inset;
        }
      }

      pts.Add(new Point3d(x, y, z));
    }

    pts.Add(pts[0]);
    return Curve.CreateInterpolatedCurve(pts, 3, CurveKnotStyle.Chord);
  }

  Curve MakeContour(Point3d c, double width, double height, double depth, double t, double organic, int seed)
  {
    return MakeContour(c, width, height, depth, t, organic, seed, 0.0);
  }

  Brep MakeContourBandSurface(
    Point3d c,
    double width,
    double height,
    double depth,
    double t,
    double baseInset,
    double layerDrop,
    double organic,
    int seed)
  {
    Curve outerCurve = MakeContour(c, width, height, depth, t, organic, seed, baseInset);
    Surface surface = Surface.CreateExtrusion(outerCurve, new Vector3d(0.0, 0.0, -layerDrop));
    if (surface == null) return null;
    return surface.ToBrep();
  }

  Mesh MakeGuideSurface(Point3d c, double width, double height, double depth, double organic, int seed)
  {
    return MakeGuideSurface(c, width, height, depth, organic, seed, 0.0);
  }

  Mesh MakeGuideSurface(Point3d c, double width, double height, double depth, double organic, int seed, double inset)
  {
    int rowCount = 18;
    int colCount = 80;
    var mesh = new Mesh();
    var ids = new int[rowCount, colCount];

    for (int r = 0; r < rowCount; r++)
    {
      double t = (double)r / (rowCount - 1);
      double growth = 0.15 + 0.85 * SmoothStep(t);
      double halfW = width * 0.5 * growth;
      double d = depth * (0.13 + 0.87 * SmoothStep(t));
      double z = c.Z - height * 0.38 + height * 0.80 * t;
      double n = 3.2 + organic * 0.8;
      double yCenter = c.Y - d * 0.50;

      for (int i = 0; i < colCount; i++)
      {
        double a = Math.PI * 2.0 * i / colCount;
        double ca = Math.Cos(a);
        double sa = Math.Sin(a);
        double sx = SignedPow(ca, 2.0 / n);
        double sy = SignedPow(sa, 2.0 / n);
        double frontBias = sy < 0.0 ? 1.0 + 0.10 * organic : 1.0 - 0.04 * organic;

        double x = c.X + sx * halfW;
        double y = yCenter + sy * d * 0.50 * frontBias;
        if (sy > 0.72)
        {
          double k = (sy - 0.72) / 0.28;
          y = Lerp(y, c.Y - 0.035, Clamp(k, 0.0, 1.0));
        }

        double wave = Math.Sin(a * 3.0 + seed * 0.17) * Math.Sin(t * Math.PI);
        x += wave * width * 0.025 * organic;
        y += Math.Cos(a * 2.0 + seed * 0.11) * depth * 0.018 * organic * (1.0 - Math.Max(0.0, sy));

        if (inset > 0.0)
        {
          Vector3d inward = new Vector3d(c.X - x, yCenter - y, 0.0);
          if (inward.Length > 0.001)
          {
            inward.Unitize();
            x += inward.X * inset;
            y += inward.Y * inset;
          }
        }

        ids[r, i] = mesh.Vertices.Add(x, y, z);
      }
    }

    for (int r = 0; r < rowCount - 1; r++)
    {
      for (int i = 0; i < colCount; i++)
      {
        int next = (i + 1) % colCount;
        mesh.Faces.AddFace(ids[r, i], ids[r, next], ids[r + 1, next], ids[r + 1, i]);
      }
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  Mesh MakeGuideShell(Point3d c, double width, double height, double depth, double organic, int seed, double baseInset, double thickness)
  {
    int rowCount = 18;
    int colCount = 80;
    var mesh = new Mesh();
    var outer = new int[rowCount, colCount];
    var inner = new int[rowCount, colCount];

    for (int r = 0; r < rowCount; r++)
    {
      double t = (double)r / (rowCount - 1);

      for (int i = 0; i < colCount; i++)
      {
        double a = Math.PI * 2.0 * i / colCount;
        Point3d po = GuideSurfacePoint(c, width, height, depth, t, a, organic, seed, baseInset);
        Point3d pi = GuideSurfacePoint(c, width, height, depth, t, a, organic, seed, baseInset + thickness);

        outer[r, i] = mesh.Vertices.Add(po);
        inner[r, i] = mesh.Vertices.Add(pi);
      }
    }

    for (int r = 0; r < rowCount - 1; r++)
    {
      for (int i = 0; i < colCount; i++)
      {
        int next = (i + 1) % colCount;
        mesh.Faces.AddFace(outer[r, i], outer[r, next], outer[r + 1, next], outer[r + 1, i]);
        mesh.Faces.AddFace(inner[r, next], inner[r, i], inner[r + 1, i], inner[r + 1, next]);
      }
    }

    for (int i = 0; i < colCount; i++)
    {
      int next = (i + 1) % colCount;
      mesh.Faces.AddFace(outer[0, next], outer[0, i], inner[0, i], inner[0, next]);
      mesh.Faces.AddFace(outer[rowCount - 1, i], outer[rowCount - 1, next], inner[rowCount - 1, next], inner[rowCount - 1, i]);
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  Point3d GuideSurfacePoint(Point3d c, double width, double height, double depth, double t, double a, double organic, int seed, double inset)
  {
    double growth = 0.15 + 0.85 * SmoothStep(t);
    double halfW = width * 0.5 * growth;
    double d = depth * (0.13 + 0.87 * SmoothStep(t));
    double z = c.Z - height * 0.38 + height * 0.80 * t;
    double n = 3.2 + organic * 0.8;
    double yCenter = c.Y - d * 0.50;

    double ca = Math.Cos(a);
    double sa = Math.Sin(a);
    double sx = SignedPow(ca, 2.0 / n);
    double sy = SignedPow(sa, 2.0 / n);
    double frontBias = sy < 0.0 ? 1.0 + 0.10 * organic : 1.0 - 0.04 * organic;

    double x = c.X + sx * halfW;
    double y = yCenter + sy * d * 0.50 * frontBias;

    if (sy > 0.72)
    {
      double k = (sy - 0.72) / 0.28;
      y = Lerp(y, c.Y - 0.035, Clamp(k, 0.0, 1.0));
    }

    double wave = Math.Sin(a * 3.0 + seed * 0.17) * Math.Sin(t * Math.PI);
    x += wave * width * 0.025 * organic;
    y += Math.Cos(a * 2.0 + seed * 0.11) * depth * 0.018 * organic * (1.0 - Math.Max(0.0, sy));

    if (inset > 0.0)
    {
      Vector3d inward = new Vector3d(c.X - x, yCenter - y, 0.0);
      if (inward.Length > 0.001)
      {
        inward.Unitize();
        x += inward.X * inset;
        y += inward.Y * inset;
      }
    }

    return new Point3d(x, y, z);
  }

  void AddBrackets(PocketData result, Point3d c, double width, double height, double depth)
  {
    double tube = Math.Max(0.07, Math.Min(width, height) * 0.035);
    double armZ = c.Z - height * 0.12;
    double armInsetX = width * 0.20;

    for (int s = -1; s <= 1; s += 2)
    {
      double bx = c.X + s * armInsetX;
      result.Brackets.Add(BoxBrep(
        new Point3d(bx - tube, c.Y - depth * 0.60, armZ - tube),
        new Point3d(bx + tube, c.Y + 0.04, armZ + tube)));

      result.Brackets.Add(BoxBrep(
        new Point3d(bx - tube * 1.7, c.Y - 0.07, armZ - height * 0.08),
        new Point3d(bx + tube * 1.7, c.Y + 0.07, armZ + height * 0.08)));
    }
  }

  void AddBackPlateHooksAndSlots(PocketData result, Point3d c, double width, double height, double depth, double rowHookZ)
  {
    double plateHalfW = width * 0.36;
    double plateBottom = c.Z - height * 0.22;
    double plateTop = c.Z + height * 0.34;
    double plateY0 = c.Y - 0.055;
    double plateY1 = c.Y + 0.055;

    double hookInsetX = width * 0.20;
    double hookW = Math.Max(0.18, width * 0.055);
    double hookDrop = Math.Max(0.75, height * 0.42);
    double hookD = Math.Max(0.34, depth * 0.22);
    double hookRodR = Math.Max(0.035, Math.Min(width, height) * 0.018);
    double pinR = Math.Max(0.065, hookD * 0.18);

    // Full-height vertical adjustment slots: same Z span as the corresponding backplate.
    double slotW = hookW * 0.42;
    double slotY0 = plateY0 - 0.02;
    double slotY1 = plateY1 + 0.02;

    for (int s = -1; s <= 1; s += 2)
    {
      double hx = c.X + s * hookInsetX;
      Brep slot = BoxBrep(
        new Point3d(hx - slotW * 0.5, slotY0, plateBottom),
        new Point3d(hx + slotW * 0.5, slotY1, plateTop));
      result.HookSlots.Add(slot);

      // Inverted J hook: long bearing leg on one side, 2 inch return after the crown.
      foreach (Brep b in MakeJHookPipe(hx, plateY1, rowHookZ, hookW, hookD, hookDrop, hookRodR))
      {
        result.Hooks.Add(b);
      }

      // Bearing washer/plate around the slot on the +Y side.
      result.Hooks.Add(BoxBrep(
        new Point3d(hx - hookW * 0.72, plateY1 + 0.004, rowHookZ - pinR * 1.35),
        new Point3d(hx + hookW * 0.72, plateY1 + 0.040, rowHookZ + pinR * 1.35)));
    }

    Brep plate = BoxBrep(
      new Point3d(c.X - plateHalfW, plateY0, plateBottom),
      new Point3d(c.X + plateHalfW, plateY1, plateTop));
    result.BackPlate = plate;
  }

  void AddDrainHoles(PocketData result, Point3d c, double width, double height, double depth)
  {
    for (int i = -1; i <= 1; i++)
    {
      Point3d p = new Point3d(c.X + i * width * 0.12, c.Y - depth * 0.50, c.Z - height * 0.26);
      result.DrainHoles.Add(new Circle(new Plane(p, Vector3d.YAxis), Math.Max(0.045, width * 0.015)).ToNurbsCurve());
    }
  }

  List<Brep> MakeJHookPipe(double x, double plateY, double pinZ, double hookW, double hookD, double hookDrop, double rodR)
  {
    var breps = new List<Brep>();
    var pts = new List<Point3d>();

    double yInner = plateY + hookD * 0.18;
    double yOuter = plateY + hookD;
    double cy = (yInner + yOuter) * 0.5;
    double r = (yOuter - yInner) * 0.5;
    double shortTail = 2.0 / 12.0;
    double longDrop = hookDrop * 0.60;

    pts.Add(new Point3d(x, yInner, pinZ - longDrop));
    pts.Add(new Point3d(x, yInner, pinZ));

    int arcSteps = 14;
    for (int i = 1; i <= arcSteps; i++)
    {
      double a = Math.PI - Math.PI * i / arcSteps;
      double y = cy + Math.Cos(a) * r;
      double z = pinZ + Math.Sin(a) * r;
      pts.Add(new Point3d(x, y, z));
    }

    pts.Add(new Point3d(x, yOuter, pinZ - shortTail));

    Curve rail = Curve.CreateInterpolatedCurve(pts, 3, CurveKnotStyle.Chord);
    if (rail == null) return breps;

    Brep[] pipe = Brep.CreatePipe(
      rail,
      rodR,
      false,
      PipeCapMode.Flat,
      true,
      0.01,
      Math.PI / 24.0);

    if (pipe != null)
    {
      for (int i = 0; i < pipe.Length; i++)
      {
        if (pipe[i] != null) breps.Add(pipe[i]);
      }
    }

    return breps;
  }

  void AddPlants(PocketData result, Point3d c, double width, double height, double depth, double soilZ, double organic, int seed)
  {
    var random = new Random(seed + 509);
    int plantCount = 7 + (int)Math.Round(organic * 7.0);

    for (int i = 0; i < plantCount; i++)
    {
      double tx = (plantCount == 1) ? 0.5 : (double)i / (plantCount - 1);
      double sx = (tx - 0.5) * 2.0;
      double baseX = c.X + sx * width * (0.20 + 0.10 * random.NextDouble());
      double baseY = c.Y - depth * (0.38 + 0.22 * random.NextDouble());
      double baseZ = soilZ + 0.08 + random.NextDouble() * height * 0.05;
      Point3d soilAnchor = new Point3d(baseX, baseY, baseZ);

      // Plant leaves now start from the upper/front lip of the pocket.
      // The original soil point is only a lower anchor for the small stem pipe.
      double lipZ = c.Z + height * 0.42;
      double lipX = c.X + sx * width * (0.28 + 0.08 * random.NextDouble());
      double lipY = c.Y - depth * (0.88 + 0.08 * random.NextDouble());
      Point3d lipAnchor = new Point3d(
        lipX,
        lipY,
        lipZ);

      double xDrift = (random.NextDouble() - 0.5) * width * 0.22;
      double outward = depth * (0.16 + random.NextDouble() * 0.24);
      double lift = height * (0.08 + random.NextDouble() * 0.08);
      double drop = height * (0.20 + random.NextDouble() * 0.28);
      double bladeW = width * (0.018 + random.NextDouble() * 0.018);

      Brep stem = MakePipeBetween(soilAnchor, lipAnchor, 0.125 / 12.0);
      if (stem != null) result.PlantStems.Add(stem);

      Mesh blade = MakeDroopingPlantRibbon(
        lipAnchor,
        xDrift,
        outward,
        lift,
        drop,
        bladeW,
        seed + i * 37);
      result.Plants.Add(blade);

      int leafCount = 2 + random.Next(3);
      for (int k = 0; k < leafCount; k++)
      {
        double t = 0.28 + random.NextDouble() * 0.58;
        Point3d leafC = PlantRibbonPoint(lipAnchor, xDrift, outward, lift, drop, t, seed + i * 37);
        double side = random.NextDouble() < 0.5 ? -1.0 : 1.0;
        result.Leaves.Add(MakeLeafPatch(
          leafC,
          side,
          width * (0.035 + random.NextDouble() * 0.030),
          height * (0.030 + random.NextDouble() * 0.030),
          random.NextDouble() * Math.PI));
      }
    }
  }

  Brep MakePipeBetween(Point3d a, Point3d b, double radius)
  {
    if (a.DistanceTo(b) < 0.001) return null;

    Curve rail = new LineCurve(a, b);
    Brep[] pipe = Brep.CreatePipe(
      rail,
      radius,
      false,
      PipeCapMode.Flat,
      true,
      0.01,
      Math.PI / 18.0);

    if (pipe == null || pipe.Length == 0) return null;
    return pipe[0];
  }

  Mesh MakeDroopingPlantRibbon(Point3d basePt, double xDrift, double outward, double lift, double drop, double bladeW, int seed)
  {
    int seg = 7;
    var mesh = new Mesh();
    var random = new Random(seed);

    for (int i = 0; i <= seg; i++)
    {
      double t = (double)i / seg;
      Point3d p = PlantRibbonPoint(basePt, xDrift, outward, lift, drop, t, seed);
      double wobble = (random.NextDouble() - 0.5) * bladeW * 0.45;
      double w = bladeW * (1.0 - 0.55 * t);
      mesh.Vertices.Add(p.X - w + wobble, p.Y, p.Z);
      mesh.Vertices.Add(p.X + w + wobble, p.Y, p.Z);
    }

    for (int i = 0; i < seg; i++)
    {
      int a = i * 2;
      mesh.Faces.AddFace(a, a + 1, a + 3, a + 2);
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  Point3d PlantRibbonPoint(Point3d basePt, double xDrift, double outward, double lift, double drop, double t, int seed)
  {
    double sway = Math.Sin(t * Math.PI * 2.0 + seed * 0.31) * 0.08 * t;
    double s = SmoothStep(t);
    double x = basePt.X + xDrift * s + sway;
    double y = basePt.Y - outward * s;
    double z = basePt.Z + lift * Math.Sin(t * Math.PI) - drop * s;
    return new Point3d(x, y, z);
  }

  Mesh MakeLeafPatch(Point3d c, double side, double w, double h, double angle)
  {
    var mesh = new Mesh();
    double ca = Math.Cos(angle);
    double sa = Math.Sin(angle);
    Vector3d xAxis = new Vector3d(side * ca, -0.20, sa * 0.25);
    Vector3d zAxis = new Vector3d(-side * sa * 0.15, -0.08, ca);
    xAxis.Unitize();
    zAxis.Unitize();

    mesh.Vertices.Add(c - xAxis * w * 0.15);
    mesh.Vertices.Add(c + xAxis * w + zAxis * h * 0.35);
    mesh.Vertices.Add(c + xAxis * w * 1.75);
    mesh.Vertices.Add(c + xAxis * w - zAxis * h * 0.45);
    mesh.Faces.AddFace(0, 1, 2, 3);
    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  Mesh MakeSoilFromContour(Point3d c, double width, double height, double depth, double contourT, double inset, double organic, int seed)
  {
    int sampleCount = 72;
    int ringCount = 5;
    Curve contour = MakeContour(c, width, height, depth, contourT, organic, seed);

    Point3d[] boundary;
    double[] parameters = contour.DivideByCount(sampleCount, false, out boundary);
    if (parameters == null || boundary == null || boundary.Length < 8)
    {
      return MakeSoilSurfaceFallback(c, width * 0.62, depth * 0.46, c.Y - depth * 0.48, c.Z + height * 0.15, organic, seed);
    }

    Point3d center = AveragePoint(boundary);
    double soilZ = c.Z - height * 0.38 + height * 0.80 * contourT + height * 0.025;
    center = new Point3d(center.X, center.Y, soilZ + height * 0.018);

    var mesh = new Mesh();
    int centerId = mesh.Vertices.Add(center);
    var ids = new int[ringCount + 1, boundary.Length];

    for (int r = 1; r <= ringCount; r++)
    {
      double tr = (double)r / ringCount;
      for (int i = 0; i < boundary.Length; i++)
      {
        Point3d p = boundary[i];
        Vector3d radial = new Vector3d(p.X - center.X, p.Y - center.Y, 0.0);
        double len = radial.Length;
        if (len > 0.001)
        {
          radial.Unitize();
          p = new Point3d(p.X - radial.X * inset, p.Y - radial.Y * inset, p.Z);
        }

        double wave = Math.Sin(i * Math.PI * 2.0 / boundary.Length * 3.0 + seed * 0.21) * 0.018 * organic;
        Point3d q = LerpPoint(center, new Point3d(p.X, p.Y, soilZ + wave), tr);
        ids[r, i] = mesh.Vertices.Add(q);
      }
    }

    for (int i = 0; i < boundary.Length; i++)
    {
      int next = (i + 1) % boundary.Length;
      mesh.Faces.AddFace(centerId, ids[1, i], ids[1, next]);
    }

    for (int r = 1; r < ringCount; r++)
    {
      for (int i = 0; i < boundary.Length; i++)
      {
        int next = (i + 1) % boundary.Length;
        mesh.Faces.AddFace(ids[r, i], ids[r + 1, i], ids[r + 1, next], ids[r, next]);
      }
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  Point3d AveragePoint(Point3d[] pts)
  {
    double x = 0.0;
    double y = 0.0;
    double z = 0.0;
    for (int i = 0; i < pts.Length; i++)
    {
      x += pts[i].X;
      y += pts[i].Y;
      z += pts[i].Z;
    }
    double n = Math.Max(1, pts.Length);
    return new Point3d(x / n, y / n, z / n);
  }

  Mesh MakeSoilSurfaceFallback(Point3d c, double width, double depth, double y, double z, double organic, int seed)
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

  Brep BoxBrep(Point3d a, Point3d b)
  {
    var x = new Interval(Math.Min(a.X, b.X), Math.Max(a.X, b.X));
    var y = new Interval(Math.Min(a.Y, b.Y), Math.Max(a.Y, b.Y));
    var z = new Interval(Math.Min(a.Z, b.Z), Math.Max(a.Z, b.Z));
    return new Box(Plane.WorldXY, x, y, z).ToBrep();
  }

  double SmoothStep(double t)
  {
    t = Clamp(t, 0.0, 1.0);
    return t * t * (3.0 - 2.0 * t);
  }

  double SignedPow(double x, double p)
  {
    return Math.Sign(x) * Math.Pow(Math.Abs(x), p);
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
