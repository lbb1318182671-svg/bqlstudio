// Grasshopper Script Instance
// Organic closed-Brep pocket form study
//
// Use this as a separate C# component for pocket form exploration only.
// Inputs:
// W double                  // overall bay width, e.g. 18
// FloorH double             // floor-to-floor height, e.g. 12
// Levels int                // e.g. 3
// PlantersPerLevel int      // e.g. 4
// PlanterScale double       // e.g. 1.0
// Organic double            // 0 to 1, e.g. 0.75
// Seed int                  // e.g. 7
//
// Outputs:
// PocketForms               // Generic / No Type Hint
// PocketCenters             // Generic / No Type Hint
// PocketProfiles            // Generic / No Type Hint

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
    ref object PocketForms,
    ref object PocketCenters,
    ref object PocketProfiles)
  {
    W = Math.Max(W, 8.0);
    FloorH = Math.Max(FloorH, 8.0);
    Levels = Math.Max(Levels, 1);
    PlantersPerLevel = Math.Max(PlantersPerLevel, 1);
    PlanterScale = Math.Max(PlanterScale, 0.35);
    Organic = Math.Max(0.0, Math.Min(Organic, 1.0));

    var forms = new List<object>();
    var centers = new List<object>();
    var profiles = new List<object>();
    var random = new Random(Seed);

    double bayStep = W / PlantersPerLevel;
    double facadeY = 0.0;

    for (int level = 0; level < Levels; level++)
    {
      for (int j = 0; j < PlantersPerLevel; j++)
      {
        double u = PlantersPerLevel == 1 ? 0.5 : (double)j / (PlantersPerLevel - 1);
        double v = Levels == 1 ? 0.5 : (double)level / (Levels - 1);

        // Smooth gradient: larger toward the middle/top-right, smaller at corners.
        double centerBias = 1.0 - Math.Abs(u - 0.5) * 0.55;
        double verticalBias = 0.78 + 0.30 * Math.Sin((v + 0.15) * Math.PI);
        double waveBias = 1.0 + 0.18 * Math.Sin((j * 1.7 + level * 0.9 + Seed * 0.13));
        double randomBias = 1.0 + (random.NextDouble() - 0.5) * 0.32 * Organic;
        double scale = PlanterScale * centerBias * verticalBias * waveBias * randomBias;

        double x = -W * 0.5 + bayStep * (j + 0.5);
        x += (random.NextDouble() - 0.5) * bayStep * 0.22 * Organic;

        double z = level * FloorH + FloorH * (0.48 + 0.08 * Math.Sin(j * 1.25 + level + Seed * 0.2));
        z += (random.NextDouble() - 0.5) * FloorH * 0.12 * Organic;

        double width = bayStep * (0.58 + 0.20 * Organic) * scale;
        double height = FloorH * (0.20 + 0.08 * Organic) * scale;
        double depth = (1.10 + 0.55 * Organic) * scale;

        Point3d center = new Point3d(x, facadeY, z);
        Brep pocket = MakeOrganicClosedPocket(center, width, height, depth, Organic, Seed + level * 53 + j * 19, profiles);
        if (pocket != null) forms.Add(pocket);
        centers.Add(center);
      }
    }

    Print("Generated " + forms.Count + " organic closed-Brep pocket forms.");

    PocketForms = forms;
    PocketCenters = centers;
    PocketProfiles = profiles;
  }

  Brep MakeOrganicClosedPocket(Point3d c, double width, double height, double depth, double organic, int seed, List<object> profiles)
  {
    // A closed massing pocket: small back, deep belly, raised front lip.
    // Cross sections are ellipses in XZ, placed along Y.
    var curves = new List<Curve>();

    double[] ys = new double[] {
      0.00,
      -depth * 0.20,
      -depth * 0.58,
      -depth * 0.92,
      -depth * 1.00,
      -depth * 0.78,
      -depth * 0.36
    };

    double[] wScales = new double[] {
      0.30,
      0.58,
      0.92,
      1.05,
      0.94,
      0.72,
      0.18
    };

    double[] hScales = new double[] {
      0.32,
      0.56,
      0.86,
      1.00,
      0.72,
      0.46,
      0.14
    };

    double[] zOffsets = new double[] {
      0.10,
      -0.03,
      -0.18,
      -0.22,
      0.02,
      0.24,
      0.38
    };

    for (int i = 0; i < ys.Length; i++)
    {
      double t = (double)i / (ys.Length - 1);
      double phase = seed * 0.19 + i * 0.73;

      double w = width * wScales[i] * (1.0 + Math.Sin(phase) * 0.08 * organic);
      double h = height * hScales[i] * (1.0 + Math.Cos(phase * 0.8) * 0.08 * organic);
      double y = c.Y + ys[i] + Math.Sin(phase * 1.1) * depth * 0.045 * organic;
      double z = c.Z + zOffsets[i] * height + Math.Cos(phase) * height * 0.045 * organic;

      Curve crv = OrganicEllipse(new Point3d(c.X, y, z), w, h, organic, seed + i * 11);
      curves.Add(crv);
      profiles.Add(crv);
    }

    Brep[] loft = Brep.CreateFromLoft(curves, Point3d.Unset, Point3d.Unset, LoftType.Normal, false);
    if (loft == null || loft.Length == 0) return null;

    Brep joined = loft[0];
    Brep capped = joined.CapPlanarHoles(0.01);
    if (capped != null) joined = capped;

    // If caps fail, add two planar caps manually.
    if (!joined.IsSolid)
    {
      var pieces = new List<Brep>();
      pieces.Add(joined);
      Brep backCap = Brep.CreatePlanarBreps(curves[0], 0.01)?.FirstOrDefault();
      Brep frontCap = Brep.CreatePlanarBreps(curves[curves.Count - 1], 0.01)?.FirstOrDefault();
      if (backCap != null) pieces.Add(backCap);
      if (frontCap != null) pieces.Add(frontCap);
      Brep[] merged = Brep.JoinBreps(pieces, 0.01);
      if (merged != null && merged.Length > 0) joined = merged[0];
    }

    return joined;
  }

  Curve OrganicEllipse(Point3d center, double width, double height, double organic, int seed)
  {
    int n = 36;
    var pts = new List<Point3d>();

    for (int i = 0; i < n; i++)
    {
      double a = Math.PI * 2.0 * i / n;
      double ripple =
        Math.Sin(a * 3.0 + seed * 0.17) * 0.055 +
        Math.Sin(a * 5.0 + seed * 0.11) * 0.030;
      double r = 1.0 + ripple * organic;

      double x = center.X + Math.Cos(a) * width * 0.5 * r;
      double z = center.Z + Math.Sin(a) * height * 0.5 * r;
      pts.Add(new Point3d(x, center.Y, z));
    }

    pts.Add(pts[0]);
    Curve poly = new Polyline(pts).ToNurbsCurve();
    Curve smooth = Curve.CreateInterpolatedCurve(pts, 3, CurveKnotStyle.Chord);
    return smooth ?? poly;
  }
}
