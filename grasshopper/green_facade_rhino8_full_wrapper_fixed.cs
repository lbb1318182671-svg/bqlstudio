// Grasshopper Script Instance
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
    Members:
      RhinoDoc RhinoDocument
      GH_Document GrasshopperDocument
      IGH_Component Component
      int Iteration

    Methods (Virtual & overridable):
      Print(string text)
      Print(string format, params object[] args)
      Reflect(object obj)
      Reflect(object obj, string method_name)
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
    W = Math.Max(W, 1.8);
    FloorH = Math.Max(FloorH, 2.8);
    Levels = Math.Max(Levels, 1);
    CorridorD = Math.Max(CorridorD, 0.8);
    MeshGap = Math.Max(MeshGap, 0.2);
    PlantersPerLevel = Math.Max(PlantersPerLevel, 1);
    PlanterScale = Math.Max(PlanterScale, 0.25);
    Organic = Math.Max(0.0, Math.Min(Organic, 1.0));

    var glazing = new List<Brep>();
    var corridor = new List<Brep>();
    var screen = new List<Curve>();
    var planters = new List<Mesh>();
    var plants = new List<Curve>();
    var brackets = new List<Brep>();

    double totalH = Levels * FloorH;
    double innerY = 0.0;
    double outerY = -CorridorD - MeshGap;

    for (int i = 0; i < Levels; i++)
    {
      double z0 = i * FloorH + 0.25;
      double z1 = (i + 1) * FloorH - 0.30;
      glazing.Add(BoxBrep(new Point3d(-W * 0.5, innerY, z0), new Point3d(W * 0.5, innerY + 0.08, z1)));

      double doorW = W * 0.22;
      glazing.Add(BoxBrep(new Point3d(-doorW * 0.5, innerY - 0.03, z0), new Point3d(doorW * 0.5, innerY + 0.11, z0 + 2.15)));
    }

    for (int i = 0; i <= Levels; i++)
    {
      double z = i * FloorH;
      corridor.Add(BoxBrep(new Point3d(-W * 0.55, -CorridorD, z - 0.08), new Point3d(W * 0.55, 0.06, z + 0.08)));
    }

    for (int i = 0; i < Levels; i++)
    {
      double railZ = i * FloorH + 1.10;
      corridor.Add(BoxBrep(new Point3d(-W * 0.55, -CorridorD - 0.03, railZ - 0.035), new Point3d(W * 0.55, -CorridorD + 0.03, railZ + 0.035)));
    }

    double dx = W / 10.0;
    double dz = FloorH / 5.0;
    for (double x = -W * 0.65; x <= W * 0.65; x += dx)
    {
      for (double z = 0.15; z <= totalH - 0.15; z += dz)
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
        double jitter = (random.NextDouble() - 0.5) * bayStep * 0.28 * Organic;
        double z = level * FloorH + FloorH * (0.58 + 0.12 * Math.Sin(j + level * 1.7));
        double width = bayStep * 0.78 * PlanterScale;
        double height = FloorH * 0.24 * PlanterScale;
        double depth = 0.42 * PlanterScale;

        Mesh pod = OrganicPlanterMesh(
          new Point3d(x + jitter, outerY - 0.13, z),
          width,
          height,
          depth,
          Organic,
          Seed + level * 31 + j * 11);
        planters.Add(pod);

        brackets.Add(BoxBrep(
          new Point3d(x - width * 0.38, outerY + 0.02, z - height * 0.18),
          new Point3d(x + width * 0.38, outerY + 0.10, z + height * 0.18)));
        brackets.Add(BoxBrep(
          new Point3d(x - width * 0.34, outerY + 0.02, z - height * 0.05),
          new Point3d(x - width * 0.28, -CorridorD + 0.05, z + height * 0.02)));
        brackets.Add(BoxBrep(
          new Point3d(x + width * 0.28, outerY + 0.02, z - height * 0.05),
          new Point3d(x + width * 0.34, -CorridorD + 0.05, z + height * 0.02)));

        for (int k = 0; k < 5; k++)
        {
          double px = x + (random.NextDouble() - 0.5) * width * 0.65;
          double rise = 0.35 + random.NextDouble() * 0.75;
          var vine = new Polyline();
          vine.Add(new Point3d(px, outerY - depth * 0.95, z + height * 0.05));
          vine.Add(new Point3d(px + 0.10 * Math.Sin(k), outerY - depth * 0.72, z + rise * 0.45));
          vine.Add(new Point3d(px + 0.18 * Math.Cos(k), outerY - depth * 0.52, z + rise));
          plants.Add(vine.ToNurbsCurve());
        }
      }
    }

    Print("Generated: " + corridor.Count + " corridor breps, " + planters.Count + " planter meshes.");

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

  Mesh OrganicPlanterMesh(Point3d c, double w, double h, double d, double organic, int seed)
  {
    int uCount = 28;
    int vCount = 12;
    var mesh = new Mesh();

    for (int v = 0; v <= vCount; v++)
    {
      double tv = (double)v / vCount;
      double angle = -Math.PI * 0.12 + tv * Math.PI * 0.92;
      double z = c.Z + Math.Sin(angle) * h * 0.58;
      double cup = Math.Cos(angle);

      for (int u = 0; u <= uCount; u++)
      {
        double tu = (double)u / uCount;
        double xNorm = (tu - 0.5) * 2.0;
        double edgeFalloff = Math.Sqrt(Math.Max(0.0, 1.0 - Math.Abs(xNorm) * 0.45));
        double wave = Math.Sin(tu * Math.PI * 3.0 + seed * 0.17) * Math.Sin(tv * Math.PI * 2.0);
        double rib = Math.Sin(tv * Math.PI * 10.0) * 0.018 * organic;

        double x = c.X + xNorm * w * 0.5 * edgeFalloff;
        double y = c.Y - d * (0.18 + 0.82 * cup) + wave * d * 0.12 * organic + rib;
        double zz = z + wave * h * 0.10 * organic;
        mesh.Vertices.Add(x, y, zz);
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
}
