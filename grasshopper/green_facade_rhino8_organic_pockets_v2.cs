// Grasshopper Script Instance
// Rhino 8 / Grasshopper C# component
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
    This version makes a double facade bay with:
    - inner high-performance glazing, mullions, and operable doors
    - outdoor corridor slabs, guardrails, and edge beams
    - outer diamond metal screen and perimeter frame
    - organic GFRC/UHPC precast planting pockets
    - soil surfaces, rolled lips, drainage holes, drip irrigation, brackets, and bolts
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
    W = Math.Max(W, 8.0);
    FloorH = Math.Max(FloorH, 9.0);
    Levels = Math.Max(Levels, 1);
    CorridorD = Math.Max(CorridorD, 3.0);
    MeshGap = Math.Max(MeshGap, 0.8);
    PlantersPerLevel = Math.Max(PlantersPerLevel, 1);
    PlanterScale = Math.Max(PlanterScale, 1.0);
    Organic = Math.Max(0.0, Math.Min(Organic, 1.0));

    var glazing = new List<object>();
    var corridor = new List<object>();
    var screen = new List<object>();
    var planters = new List<object>();
    var plants = new List<object>();
    var brackets = new List<object>();

    double totalH = Levels * FloorH;
    double innerY = 0.0;
    double outerY = -CorridorD - MeshGap;

    // Inner glazing, frames, and operable classroom/office doors.
    for (int i = 0; i < Levels; i++)
    {
      double z0 = i * FloorH + 0.55;
      double z1 = (i + 1) * FloorH - 0.65;
      double sill = z0 + 2.25;
      double head = z1 - 0.25;

      glazing.Add(BoxBrep(new Point3d(-W * 0.50, innerY, z0), new Point3d(W * 0.50, innerY + 0.09, z1)));

      // Curtain wall mullions and rails.
      for (int m = 0; m <= 4; m++)
      {
        double x = -W * 0.5 + W * m / 4.0;
        glazing.Add(BoxBrep(new Point3d(x - 0.035, innerY - 0.03, z0), new Point3d(x + 0.035, innerY + 0.18, z1)));
      }
      glazing.Add(BoxBrep(new Point3d(-W * 0.50, innerY - 0.03, sill - 0.035), new Point3d(W * 0.50, innerY + 0.18, sill + 0.035)));
      glazing.Add(BoxBrep(new Point3d(-W * 0.50, innerY - 0.03, head - 0.035), new Point3d(W * 0.50, innerY + 0.18, head + 0.035)));

      double doorW = W * 0.18;
      double doorX = W * 0.23;
      glazing.Add(BoxBrep(new Point3d(doorX - doorW * 0.5, innerY - 0.055, z0), new Point3d(doorX + doorW * 0.5, innerY + 0.16, z0 + 7.1)));
      glazing.Add(new ArcCurve(new Arc(
        new Point3d(doorX - doorW * 0.5, innerY - 0.04, z0),
        new Point3d(doorX + doorW * 0.05, innerY - doorW * 0.55, z0),
        new Point3d(doorX + doorW * 0.5, innerY - 0.04, z0))));
    }

    // Outdoor corridor slabs, drainage edge, guardrails, and periodic posts.
    for (int i = 0; i <= Levels; i++)
    {
      double z = i * FloorH;
      corridor.Add(BoxBrep(new Point3d(-W * 0.58, -CorridorD, z - 0.13), new Point3d(W * 0.58, 0.10, z + 0.13)));
      corridor.Add(BoxBrep(new Point3d(-W * 0.58, -CorridorD - 0.07, z - 0.18), new Point3d(W * 0.58, -CorridorD + 0.07, z + 0.18)));
    }

    for (int i = 0; i < Levels; i++)
    {
      double baseZ = i * FloorH;
      double railZ = baseZ + 3.55;
      corridor.Add(BoxBrep(new Point3d(-W * 0.58, -CorridorD - 0.04, railZ - 0.045), new Point3d(W * 0.58, -CorridorD + 0.04, railZ + 0.045)));
      corridor.Add(BoxBrep(new Point3d(-W * 0.58, -CorridorD - 0.035, baseZ + 1.85), new Point3d(W * 0.58, -CorridorD + 0.035, baseZ + 1.93)));

      for (int p = 0; p <= 4; p++)
      {
        double x = -W * 0.55 + W * 1.10 * p / 4.0;
        corridor.Add(BoxBrep(new Point3d(x - 0.035, -CorridorD - 0.04, baseZ + 0.15), new Point3d(x + 0.035, -CorridorD + 0.04, railZ)));
      }
    }

    // Outer metal screen: perimeter frame, verticals, and expanded diamond lattice.
    screen.Add(new PolylineCurve(new Point3d[] {
      new Point3d(-W * 0.66, outerY, 0.0),
      new Point3d(W * 0.66, outerY, 0.0),
      new Point3d(W * 0.66, outerY, totalH),
      new Point3d(-W * 0.66, outerY, totalH),
      new Point3d(-W * 0.66, outerY, 0.0)
    }));

    for (int m = 0; m <= 4; m++)
    {
      double x = -W * 0.60 + W * 1.20 * m / 4.0;
      screen.Add(new LineCurve(new Point3d(x, outerY, 0.0), new Point3d(x, outerY, totalH)));
    }

    double dx = W / 12.0;
    double dz = FloorH / 6.0;
    for (double x = -W * 0.68; x <= W * 0.68; x += dx)
    {
      for (double z = 0.10; z <= totalH - 0.10; z += dz)
      {
        screen.Add(new PolylineCurve(new Point3d[] {
          new Point3d(x, outerY, z),
          new Point3d(x + dx * 0.5, outerY, z + dz * 0.5),
          new Point3d(x, outerY, z + dz),
          new Point3d(x - dx * 0.5, outerY, z + dz * 0.5),
          new Point3d(x, outerY, z)
        }));
      }
    }

    var random = new Random(Seed);
    double bayStep = W / PlantersPerLevel;

    for (int level = 0; level < Levels; level++)
    {
      for (int j = 0; j < PlantersPerLevel; j++)
      {
        double x = -W * 0.5 + bayStep * (j + 0.5);
        double jitter = (random.NextDouble() - 0.5) * bayStep * 0.22 * Organic;
        double z = level * FloorH + FloorH * (0.52 + 0.11 * Math.Sin(j + level * 1.7));
        double width = bayStep * 0.88 * PlanterScale;
        double height = FloorH * 0.21 * PlanterScale;
        double depth = 0.55 * PlanterScale;
        Point3d c = new Point3d(x + jitter, outerY - 0.18, z);

        Mesh shell = OrganicPrecastPocketMesh(c, width, height, depth, Organic, Seed + level * 41 + j * 17);
        Mesh soil = SoilSurfaceMesh(c, width * 0.70, depth * 0.88, z + height * 0.18, outerY - depth * 0.72);
        planters.Add(shell);
        planters.Add(soil);

        foreach (Curve crv in PocketRibCurves(c, width, height, depth, Organic, Seed + j * 13))
          planters.Add(crv);

        foreach (Curve hole in DrainHoleCurves(c, width, height, depth))
          planters.Add(hole);

        // Stainless concealed bracket plate, cantilever arms, and visible bolt heads.
        brackets.Add(BoxBrep(
          new Point3d(c.X - width * 0.39, outerY + 0.015, c.Z - height * 0.08),
          new Point3d(c.X + width * 0.39, outerY + 0.11, c.Z + height * 0.12)));

        double armZ = c.Z - height * 0.10;
        brackets.Add(BoxBrep(new Point3d(c.X - width * 0.30, outerY + 0.02, armZ - 0.05), new Point3d(c.X - width * 0.24, -CorridorD + 0.10, armZ + 0.05)));
        brackets.Add(BoxBrep(new Point3d(c.X + width * 0.24, outerY + 0.02, armZ - 0.05), new Point3d(c.X + width * 0.30, -CorridorD + 0.10, armZ + 0.05)));

        for (int b = 0; b < 4; b++)
        {
          double bx = c.X + (b < 2 ? -width * 0.30 : width * 0.30);
          double bz = c.Z + (b % 2 == 0 ? -height * 0.01 : height * 0.08);
          brackets.Add(CylinderBrep(new Point3d(bx, outerY - 0.035, bz), Vector3d.YAxis, 0.055, 0.08));
        }

        // Drip irrigation tube and small emitters along the soil line.
        var drip = new Polyline();
        drip.Add(new Point3d(c.X - width * 0.34, outerY - depth * 0.55, c.Z + height * 0.22));
        drip.Add(new Point3d(c.X - width * 0.10, outerY - depth * 0.62, c.Z + height * 0.24));
        drip.Add(new Point3d(c.X + width * 0.12, outerY - depth * 0.61, c.Z + height * 0.22));
        drip.Add(new Point3d(c.X + width * 0.34, outerY - depth * 0.56, c.Z + height * 0.23));
        planters.Add(drip.ToNurbsCurve());

        for (int e = 0; e < 3; e++)
        {
          double ex = c.X - width * 0.22 + e * width * 0.22;
          planters.Add(CylinderBrep(new Point3d(ex, outerY - depth * 0.60, c.Z + height * 0.22), Vector3d.ZAxis, 0.025, 0.08));
        }

        // Planting: grasses, trailing vines, and mesh-climbing leaders.
        for (int k = 0; k < 7; k++)
        {
          double px = c.X + (random.NextDouble() - 0.5) * width * 0.62;
          double py = outerY - depth * (0.55 + random.NextDouble() * 0.18);
          double pz = c.Z + height * 0.21;

          double rise = 0.55 + random.NextDouble() * 1.20;
          plants.Add(new ArcCurve(new Arc(
            new Point3d(px, py, pz),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.55, py - 0.12, pz + rise * 0.55),
            new Point3d(px + (random.NextDouble() - 0.5) * 0.95, py - 0.05, pz + rise))));

          var vine = new Polyline();
          vine.Add(new Point3d(px, py, pz));
          vine.Add(new Point3d(px + 0.18 * Math.Sin(k + Seed), outerY - depth * 0.18, pz + rise * 0.75));
          vine.Add(new Point3d(px + 0.35 * Math.Cos(k), outerY + 0.02, pz + rise * 1.25));
          plants.Add(vine.ToNurbsCurve());

          // Simple leaf marks.
          Ellipse leaf = new Ellipse(
  new Plane(new Point3d(px, py - 0.03, pz + rise * 0.45), Vector3d.YAxis),
  0.10 + random.NextDouble() * 0.05,
  0.035 + random.NextDouble() * 0.02
);
plants.Add(leaf.ToNurbsCurve());
        }
      }
    }

    Print("Generated detailed facade: " + planters.Count + " planter/detail objects, " + plants.Count + " plant curves.");

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

  Brep CylinderBrep(Point3d center, Vector3d axis, double radius, double length)
  {
    axis.Unitize();
    Plane plane = new Plane(center - axis * (length * 0.5), axis);
    return new Cylinder(new Circle(plane, radius), length).ToBrep(true, true);
  }

  Mesh OrganicPrecastPocketMesh(Point3d c, double w, double h, double d, double organic, int seed)
  {
    int uCount = 34;
    int vCount = 18;
    var mesh = new Mesh();

    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;
      double vertical = (tv - 0.5) * 2.0;
      double belly = Math.Sin(tv * Math.PI);
      double topOpen = SmoothStep(0.58, 1.0, tv);
      double widthAtV = 0.58 + 0.44 * belly + 0.16 * topOpen;

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double xNorm = (tu - 0.5) * 2.0;
        double edgeFalloff = Math.Sqrt(Math.Max(0.0, 1.0 - Math.Abs(xNorm) * 0.22));
        double lateralDip = 1.0 - Math.Abs(xNorm);
        double wave =
          Math.Sin(tu * Math.PI * 2.4 + seed * 0.11) *
          Math.Sin(tv * Math.PI * 2.1 + seed * 0.07);
        double rib = Math.Sin(tv * Math.PI * 12.0) * 0.025 * organic;

        double x = c.X + xNorm * w * 0.5 * widthAtV;
        double z = c.Z + vertical * h * 0.5 + wave * h * 0.055 * organic;

        double pocketDepth = d * (0.18 + 0.92 * belly * edgeFalloff);
        double y = c.Y - pocketDepth + lateralDip * d * 0.08 * organic + wave * d * 0.10 * organic + rib;

        mesh.Vertices.Add(x, y, z);
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
      }
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
      double x = c.X + Math.Cos(t) * w * 0.5;
      double yy = y + Math.Sin(t) * d * 0.32;
      double zz = z + Math.Sin(t * 3.0) * 0.025;
      mesh.Vertices.Add(x, yy, zz);
    }

    for (int i = 1; i <= segments; i++)
      mesh.Faces.AddFace(0, i, i + 1);

    mesh.Normals.ComputeNormals();
    mesh.Compact();
    return mesh;
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
        double widthAtV = 0.62 + 0.42 * belly;
        double wave = Math.Sin(tu * Math.PI * 2.2 + seed * 0.11) * 0.055 * organic;

        double x = c.X + xNorm * w * 0.5 * widthAtV;
        double z = c.Z + (tv - 0.5) * h + wave * h;
        double y = c.Y - d * (0.20 + 0.75 * belly * (1.0 - Math.Abs(xNorm) * 0.25));
        pl.Add(new Point3d(x, y - 0.018, z + 0.025));
      }
      ribs.Add(pl.ToNurbsCurve());
    }

    var lip = new Polyline();
    for (int i = 0; i <= 36; i++)
    {
      double tu = (double)i / 36;
      double xNorm = (tu - 0.5) * 2.0;
      double x = c.X + xNorm * w * 0.55;
      double z = c.Z + h * 0.48 + Math.Sin(tu * Math.PI * 2.0 + seed) * h * 0.035 * organic;
      double y = c.Y - d * (0.22 + 0.10 * (1.0 - Math.Abs(xNorm)));
      lip.Add(new Point3d(x, y, z));
    }
    ribs.Add(lip.ToNurbsCurve());

    return ribs;
  }

  List<Curve> DrainHoleCurves(Point3d c, double w, double h, double d)
  {
    var holes = new List<Curve>();
    for (int i = 0; i < 3; i++)
    {
      double x = c.X + (i - 1) * w * 0.16;
      double z = c.Z - h * 0.28;
      double y = c.Y - d * 0.72;
      Plane p = new Plane(new Point3d(x, y, z), Vector3d.YAxis);
      holes.Add(new Circle(p, Math.Max(0.045, w * 0.018)).ToNurbsCurve());
    }
    return holes;
  }

  double SmoothStep(double edge0, double edge1, double x)
  {
    double t = Math.Max(0.0, Math.Min(1.0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
  }
}
