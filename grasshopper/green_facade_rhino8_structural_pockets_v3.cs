// Grasshopper Script Instance
// V3: structural bay + realistic organic precast pockets
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
    This version removes doors and models the facade as a real envelope bay:
    - interior CLT floor and roof panels with primary beams
    - separate exterior corridor deck with outrigger beams and edge beams
    - continuous high-performance glazing with mullions
    - outer armature with pipe-modeled diamond mesh
    - GFRC/UHPC organic precast pocket modules with shell thickness, lip,
      back spine, bolt bosses, soil surface, drainage, and drip irrigation
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
    double innerY = 0.0;
    double interiorDepth = 7.0;
    double outerY = -CorridorD - MeshGap;
    double armatureY = outerY + 0.10;

    double cltThick = 0.58;      // about 7 in
    double corridorThick = 0.32; // protected exterior deck build-up
    double beamDepth = 0.75;
    double beamWidth = 0.38;
    double pipeR = 0.035;
    double railPipeR = 0.055;

    // Main CLT floors are inside the envelope. Exterior corridor is separate.
    for (int i = 0; i <= Levels; i++)
    {
      double z = i * FloorH;

      // Interior CLT panel stops behind the glazing/air barrier.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.55, 0.18, z - cltThick),
        new Point3d(W * 0.55, interiorDepth, z)));

      // Main glulam / steel edge beam inside thermal envelope.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.58, 0.18, z - cltThick - beamDepth),
        new Point3d(W * 0.58, 0.18 + beamWidth, z - cltThick)));

      // Separate outdoor corridor deck, slightly thinner and outside the air barrier.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, -CorridorD, z - corridorThick),
        new Point3d(W * 0.62, -0.18, z)));

      // Waterproof upstand / thermal-break strip at facade line.
      brackets.Add(BoxBrep(
        new Point3d(-W * 0.58, -0.18, z - 0.08),
        new Point3d(W * 0.58, 0.04, z + 0.45)));

      // Corridor outside edge beam.
      corridor.Add(BoxBrep(
        new Point3d(-W * 0.62, -CorridorD - beamWidth * 0.5, z - beamDepth),
        new Point3d(W * 0.62, -CorridorD + beamWidth * 0.5, z - corridorThick)));
    }

    // Secondary outriggers, posts, and guardrails.
    for (int i = 0; i < Levels; i++)
    {
      double baseZ = i * FloorH;
      double deckZ = baseZ;
      double railZ = baseZ + 3.55;

      for (int p = 0; p <= 4; p++)
      {
        double x = -W * 0.55 + W * 1.10 * p / 4.0;

        // Beams spanning from main edge beam to corridor edge.
        corridor.Add(BoxBrep(
          new Point3d(x - beamWidth * 0.45, -CorridorD, deckZ - beamDepth),
          new Point3d(x + beamWidth * 0.45, 0.10, deckZ - corridorThick)));

        // Guardrail posts.
        corridor.Add(BoxBrep(
          new Point3d(x - 0.045, -CorridorD - 0.08, baseZ + 0.10),
          new Point3d(x + 0.045, -CorridorD + 0.08, railZ)));
      }

      corridor.Add(CylinderBetween(
        new Point3d(-W * 0.62, -CorridorD, railZ),
        new Point3d(W * 0.62, -CorridorD, railZ),
        railPipeR));
      corridor.Add(CylinderBetween(
        new Point3d(-W * 0.62, -CorridorD, baseZ + 1.85),
        new Point3d(W * 0.62, -CorridorD, baseZ + 1.85),
        railPipeR * 0.65));
    }

    // Roof finish: CLT roof, tapered insulation/membrane, parapet cap.
    double roofZ = totalH;
    corridor.Add(BoxBrep(
      new Point3d(-W * 0.58, 0.18, roofZ),
      new Point3d(W * 0.58, interiorDepth, roofZ + 0.58)));
    corridor.Add(BoxBrep(
      new Point3d(-W * 0.58, 0.18, roofZ + 0.58),
      new Point3d(W * 0.58, interiorDepth, roofZ + 1.05)));
    corridor.Add(BoxBrep(
      new Point3d(-W * 0.62, -0.22, roofZ + 0.45),
      new Point3d(W * 0.62, 0.25, roofZ + 1.30)));
    corridor.Add(BoxBrep(
      new Point3d(-W * 0.66, -0.28, roofZ + 1.30),
      new Point3d(W * 0.66, 0.35, roofZ + 1.43)));

    // Continuous high-performance glazing without doors.
    for (int i = 0; i < Levels; i++)
    {
      double z0 = i * FloorH + 0.65;
      double z1 = (i + 1) * FloorH - 0.75;
      glazing.Add(BoxBrep(
        new Point3d(-W * 0.52, -0.035, z0),
        new Point3d(W * 0.52, 0.10, z1)));

      for (int m = 0; m <= 5; m++)
      {
        double x = -W * 0.52 + W * 1.04 * m / 5.0;
        glazing.Add(BoxBrep(
          new Point3d(x - 0.04, -0.09, z0),
          new Point3d(x + 0.04, 0.18, z1)));
      }

      glazing.Add(BoxBrep(new Point3d(-W * 0.53, -0.09, z0 - 0.04), new Point3d(W * 0.53, 0.18, z0 + 0.04)));
      glazing.Add(BoxBrep(new Point3d(-W * 0.53, -0.09, z1 - 0.04), new Point3d(W * 0.53, 0.18, z1 + 0.04)));
      glazing.Add(BoxBrep(new Point3d(-W * 0.53, -0.09, z0 + (z1 - z0) * 0.52 - 0.035), new Point3d(W * 0.53, 0.18, z0 + (z1 - z0) * 0.52 + 0.035)));
    }

    // Outer armature and pipe-modeled expanded mesh.
    AddPipeRect(screen, -W * 0.68, armatureY, 0.0, W * 0.68, armatureY, totalH, railPipeR);

    for (int m = 0; m <= 4; m++)
    {
      double x = -W * 0.60 + W * 1.20 * m / 4.0;
      screen.Add(CylinderBetween(new Point3d(x, armatureY, 0.0), new Point3d(x, armatureY, totalH), railPipeR));
    }

    for (int i = 0; i <= Levels; i++)
    {
      double z = i * FloorH;
      screen.Add(CylinderBetween(new Point3d(-W * 0.68, armatureY, z), new Point3d(W * 0.68, armatureY, z), railPipeR));
    }

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

    // Organic pocket modules.
    var random = new Random(Seed);
    double bayStep = W / PlantersPerLevel;

    for (int level = 0; level < Levels; level++)
    {
      for (int j = 0; j < PlantersPerLevel; j++)
      {
        double x = -W * 0.5 + bayStep * (j + 0.5);
        double jitter = (random.NextDouble() - 0.5) * bayStep * 0.18 * Organic;
        double z = level * FloorH + FloorH * (0.49 + 0.09 * Math.Sin(j + level * 1.7));
        double width = bayStep * 0.72 * PlanterScale;
        double height = FloorH * 0.18 * PlanterScale;
        double depth = 0.70 * PlanterScale;
        double shellT = 0.11 * PlanterScale;
        Point3d pc = new Point3d(x + jitter, armatureY - 0.15, z);

        Mesh pocket = OrganicPocketShellMesh(pc, width, height, depth, shellT, Organic, Seed + level * 41 + j * 17);
        planters.Add(pocket);

        // Thick back spine: flat enough for real mounting, soft enough to read as cast.
        Brep spine = BoxBrep(
          new Point3d(pc.X - width * 0.28, armatureY - 0.03, pc.Z - height * 0.34),
          new Point3d(pc.X + width * 0.28, armatureY + 0.18, pc.Z + height * 0.36));
        planters.Add(spine);

        // Rolled lip as segmented pipe following the organic upper edge.
        List<Point3d> lipPts = PocketLipPoints(pc, width, height, depth, Organic, Seed + j * 13);
        for (int l = 0; l < lipPts.Count - 1; l++)
          planters.Add(CylinderBetween(lipPts[l], lipPts[l + 1], Math.Max(0.07, shellT * 0.55)));

        // Soil surface sits inside the pocket.
        planters.Add(SoilSurfaceMesh(pc, width * 0.56, depth * 0.62, pc.Z + height * 0.24, pc.Y - depth * 0.58));

        // Precast contour ribs and drainage holes.
        foreach (Curve rib in PocketRibCurves(pc, width, height, depth, Organic, Seed + j * 19))
          planters.Add(rib);

        foreach (Curve hole in DrainHoleCurves(pc, width, height, depth))
          planters.Add(hole);

        // Bracket plate, outriggers, and bolt bosses.
        brackets.Add(BoxBrep(
          new Point3d(pc.X - width * 0.34, armatureY + 0.08, pc.Z - height * 0.14),
          new Point3d(pc.X + width * 0.34, armatureY + 0.22, pc.Z + height * 0.18)));
        brackets.Add(CylinderBetween(
          new Point3d(pc.X - width * 0.25, armatureY + 0.10, pc.Z - height * 0.10),
          new Point3d(pc.X - width * 0.25, -CorridorD + 0.18, pc.Z - height * 0.04),
          0.06));
        brackets.Add(CylinderBetween(
          new Point3d(pc.X + width * 0.25, armatureY + 0.10, pc.Z - height * 0.10),
          new Point3d(pc.X + width * 0.25, -CorridorD + 0.18, pc.Z - height * 0.04),
          0.06));

        for (int b = 0; b < 4; b++)
        {
          double bx = pc.X + (b < 2 ? -width * 0.24 : width * 0.24);
          double bz = pc.Z + (b % 2 == 0 ? -height * 0.03 : height * 0.12);
          brackets.Add(CylinderBetween(
            new Point3d(bx, armatureY - 0.02, bz),
            new Point3d(bx, armatureY - 0.13, bz),
            0.07));
        }

        // Drip irrigation line and emitters.
        List<Point3d> dripPts = new List<Point3d>();
        dripPts.Add(new Point3d(pc.X - width * 0.27, pc.Y - depth * 0.50, pc.Z + height * 0.25));
        dripPts.Add(new Point3d(pc.X - width * 0.08, pc.Y - depth * 0.58, pc.Z + height * 0.27));
        dripPts.Add(new Point3d(pc.X + width * 0.10, pc.Y - depth * 0.57, pc.Z + height * 0.25));
        dripPts.Add(new Point3d(pc.X + width * 0.27, pc.Y - depth * 0.50, pc.Z + height * 0.26));
        for (int q = 0; q < dripPts.Count - 1; q++)
          planters.Add(CylinderBetween(dripPts[q], dripPts[q + 1], 0.025));

        for (int e = 0; e < 3; e++)
        {
          double ex = pc.X - width * 0.18 + e * width * 0.18;
          planters.Add(CylinderBetween(
            new Point3d(ex, pc.Y - depth * 0.60, pc.Z + height * 0.24),
            new Point3d(ex, pc.Y - depth * 0.60, pc.Z + height * 0.10),
            0.018));
        }

        // Grasses and vine leaders trained toward the mesh.
        for (int k = 0; k < 7; k++)
        {
          double px = pc.X + (random.NextDouble() - 0.5) * width * 0.54;
          double py = pc.Y - depth * (0.48 + random.NextDouble() * 0.18);
          double pz = pc.Z + height * 0.20;
          double rise = 0.50 + random.NextDouble() * 1.15;

          plants.Add(new ArcCurve(new Arc(
            new Point3d(px, py, pz),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.40, py - 0.12, pz + rise * 0.55),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.70, py - 0.04, pz + rise))));

          var vine = new Polyline();
          vine.Add(new Point3d(px, py, pz));
          vine.Add(new Point3d(px + 0.16 * Math.Sin(k + Seed), pc.Y - depth * 0.18, pz + rise * 0.76));
          vine.Add(new Point3d(px + 0.30 * Math.Cos(k), armatureY + 0.03, pz + rise * 1.20));
          plants.Add(vine.ToNurbsCurve());

          Ellipse leaf = new Ellipse(
            new Plane(new Point3d(px, py - 0.03, pz + rise * 0.48), Vector3d.YAxis),
            0.10 + random.NextDouble() * 0.05,
            0.035 + random.NextDouble() * 0.02);
          plants.Add(leaf.ToNurbsCurve());
        }
      }
    }

    Print("Generated V3 structural facade: " + planters.Count + " planter/detail objects, " + screen.Count + " screen pipe objects.");

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

  Mesh OrganicPocketShellMesh(Point3d c, double w, double h, double d, double t, double organic, int seed)
  {
    int uCount = 34;
    int vCount = 18;
    var mesh = new Mesh();

    // Outer surface.
    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;
      double vertical = (tv - 0.5) * 2.0;
      double belly = Math.Sin(tv * Math.PI);
      double topOpen = SmoothStep(0.52, 1.0, tv);
      double widthAtV = 0.56 + 0.42 * belly + 0.18 * topOpen;

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double xNorm = (tu - 0.5) * 2.0;
        double sideSoft = 1.0 - Math.Abs(xNorm) * 0.18;
        double wave =
          Math.Sin(tu * Math.PI * 2.4 + seed * 0.11) *
          Math.Sin(tv * Math.PI * 2.1 + seed * 0.07);
        double rib = Math.Sin(tv * Math.PI * 11.0) * 0.020 * organic;

        double x = c.X + xNorm * w * 0.5 * widthAtV;
        double z = c.Z + vertical * h * 0.5 + wave * h * 0.050 * organic;
        double pocketDepth = d * (0.14 + 0.90 * belly * sideSoft);
        double y = c.Y - pocketDepth + wave * d * 0.09 * organic + rib;

        mesh.Vertices.Add(x, y, z);
      }
    }

    // Inner surface: a slightly smaller surface behind the outer surface, giving the cast shell thickness.
    int outerCount = mesh.Vertices.Count;
    for (int v = 0; v <= vCount; v++)
    {
      for (int u = 0; u <= uCount; u++)
      {
        Point3f p = mesh.Vertices[v * (uCount + 1) + u];
        double tu = (double)u / uCount;
        double tv = (double)v / vCount;
        double shrinkX = (tu - 0.5) * w * 0.035;
        double shrinkZ = (tv - 0.5) * h * 0.035;
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

    // Connect shell boundaries.
    for (int u = 0; u < uCount; u++)
    {
      AddQuad(mesh, u, u + 1, outerCount + u + 1, outerCount + u);
      int top = vCount * (uCount + 1) + u;
      AddQuad(mesh, top, outerCount + top, outerCount + top + 1, top + 1);
    }

    for (int v = 0; v < vCount; v++)
    {
      int left = v * (uCount + 1);
      int leftNext = (v + 1) * (uCount + 1);
      AddQuad(mesh, left, outerCount + left, outerCount + leftNext, leftNext);

      int right = v * (uCount + 1) + uCount;
      int rightNext = (v + 1) * (uCount + 1) + uCount;
      AddQuad(mesh, right, rightNext, outerCount + rightNext, outerCount + right);
    }

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
  }

  void AddQuad(Mesh mesh, int a, int b, int c, int d)
  {
    mesh.Faces.AddFace(a, b, c, d);
  }

  Mesh SoilSurfaceMesh(Point3d c, double w, double d, double z, double y)
  {
    int segments = 28;
    var mesh = new Mesh();
    mesh.Vertices.Add(c.X, y, z);

    for (int i = 0; i <= segments; i++)
    {
      double t = Math.PI * 2.0 * i / segments;
      double x = c.X + Math.Cos(t) * w * 0.5;
      double yy = y + Math.Sin(t) * d * 0.30;
      double zz = z + Math.Sin(t * 3.0) * 0.018;
      mesh.Vertices.Add(x, yy, zz);
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
      double x = c.X + xNorm * w * 0.56;
      double y = c.Y - d * (0.20 + 0.10 * (1.0 - Math.Abs(xNorm)));
      double z = c.Z + h * 0.50 + Math.Sin(tu * Math.PI * 2.0 + seed) * h * 0.035 * organic;
      pts.Add(new Point3d(x, y, z));
    }
    return pts;
  }

  List<Curve> PocketRibCurves(Point3d c, double w, double h, double d, double organic, int seed)
  {
    var ribs = new List<Curve>();

    for (int r = 0; r < 5; r++)
    {
      double tv = 0.16 + r * 0.17;
      var pl = new Polyline();
      for (int i = 0; i <= 28; i++)
      {
        double tu = (double)i / 28;
        double xNorm = (tu - 0.5) * 2.0;
        double belly = Math.Sin(tv * Math.PI);
        double widthAtV = 0.60 + 0.40 * belly;
        double wave = Math.Sin(tu * Math.PI * 2.2 + seed * 0.11) * 0.050 * organic;

        double x = c.X + xNorm * w * 0.5 * widthAtV;
        double z = c.Z + (tv - 0.5) * h + wave * h;
        double y = c.Y - d * (0.18 + 0.72 * belly * (1.0 - Math.Abs(xNorm) * 0.20));
        pl.Add(new Point3d(x, y - 0.02, z + 0.025));
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
      double x = c.X + (i - 1) * w * 0.15;
      double z = c.Z - h * 0.30;
      double y = c.Y - d * 0.70;
      Plane p = new Plane(new Point3d(x, y, z), Vector3d.YAxis);
      holes.Add(new Circle(p, Math.Max(0.045, w * 0.016)).ToNurbsCurve());
    }
    return holes;
  }

  double SmoothStep(double edge0, double edge1, double x)
  {
    double t = Math.Max(0.0, Math.Min(1.0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
  }
}
