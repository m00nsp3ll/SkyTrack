#import <Capacitor/Capacitor.h>

CAP_PLUGIN(AirPrintPlugin, "AirPrint",
    CAP_PLUGIN_METHOD(print, CAPPluginReturnPromise);
)
