using System;
using System.Collections.Generic;
using System.IO;
using SolidWorks.Interop.sldworks;
using SolidWorks.Interop.swconst;

public static class ExportTofCad
{
    private static readonly HashSet<string> Skip = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "28BYJ-48_Stepper.SLDPRT",
        "MPU6050.SLDPRT",
        "N20 DC Gear Motor.SLDPRT",
        "VL53L8CX Sensor Only.SLDPRT"
    };

    public static int Main(string[] args)
    {
        if (args.Length != 2)
        {
            Console.Error.WriteLine("Usage: export-tof-cad <source> <output>");
            return 2;
        }

        string source = Path.GetFullPath(args[0]);
        string output = Path.GetFullPath(args[1]);
        Directory.CreateDirectory(output);

        SldWorks sw = new SldWorksClass();
        sw.Visible = false;
        sw.UserControl = false;

        try
        {
            var files = new List<string>();
            files.AddRange(Directory.GetFiles(source, "*.SLDPRT", SearchOption.TopDirectoryOnly));
            files.AddRange(Directory.GetFiles(source, "*.SLDASM", SearchOption.TopDirectoryOnly));

            foreach (string file in files)
            {
                if (Skip.Contains(Path.GetFileName(file))) continue;
                Export(sw, file, output);
            }
        }
        finally
        {
            sw.ExitApp();
        }

        return 0;
    }

    private static void Export(SldWorks sw, string file, string output)
    {
        int errors = 0;
        int warnings = 0;
        int docType = file.EndsWith(".SLDASM", StringComparison.OrdinalIgnoreCase)
            ? (int)swDocumentTypes_e.swDocASSEMBLY
            : (int)swDocumentTypes_e.swDocPART;

        Console.WriteLine("Opening " + Path.GetFileName(file));
        ModelDoc2 model = sw.OpenDoc6(file, docType,
            (int)swOpenDocOptions_e.swOpenDocOptions_Silent,
            "", ref errors, ref warnings);

        if (model == null)
        {
            Console.Error.WriteLine("Failed: " + file + " error=" + errors);
            return;
        }

        try
        {
            model.ShowNamedView2("*Isometric", (int)swStandardViews_e.swIsometricView);
            model.ViewZoomtofit2();
            model.GraphicsRedraw2();
            string name = Path.GetFileNameWithoutExtension(file)
                .Replace(" ", "-")
                .Replace("&", "and")
                .ToLowerInvariant();
            string target = Path.Combine(output, name + ".png");
            int saveStatus = model.SaveAs3(target, 0, 0);
            Console.WriteLine((saveStatus != 0 ? "Saved " : "Save failed ") + target);
        }
        finally
        {
            sw.CloseDoc(model.GetTitle());
        }
    }
}
