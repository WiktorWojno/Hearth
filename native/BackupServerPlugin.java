package com.hearth.chat;

import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Starts the optional Termux backup server (server.py) without leaving Hearth.
 * Termux must be installed, Python installed inside Termux, and Termux must
 * allow external apps to run commands.
 */
@CapacitorPlugin(name = "BackupServer")
public class BackupServerPlugin extends Plugin {
    private static final String TERMUX = "com.termux";
    private static final String PERMISSION = "com.termux.permission.RUN_COMMAND";
    private static final int REQUEST_CODE = 7241;

    @PluginMethod
    public void start(PluginCall call) {
        Context ctx = getContext();
        try {
            ctx.getPackageManager().getPackageInfo(TERMUX, 0);
        } catch (PackageManager.NameNotFoundException e) {
            call.reject("Termux is not installed");
            return;
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                && ctx.checkSelfPermission(PERMISSION) != PackageManager.PERMISSION_GRANTED) {
            if (getActivity() == null) {
                call.reject("Could not request the Termux permission");
                return;
            }
            getActivity().requestPermissions(new String[]{PERMISSION}, REQUEST_CODE);
            JSObject result = new JSObject();
            result.put("permission", true);
            call.resolve(result);
            return;
        }

        String command = call.getString("command", "cd \"$HOME\" && python3 server.py");
        Intent intent = new Intent();
        intent.setClassName(TERMUX, "com.termux.app.RunCommandService");
        intent.setAction("com.termux.RUN_COMMAND");
        intent.putExtra("com.termux.RUN_COMMAND_PATH", "/data/data/com.termux/files/usr/bin/bash");
        intent.putExtra("com.termux.RUN_COMMAND_ARGUMENTS", new String[]{"-lc", command});
        intent.putExtra("com.termux.RUN_COMMAND_WORKDIR", "/data/data/com.termux/files/home");
        intent.putExtra("com.termux.RUN_COMMAND_BACKGROUND", true);
        intent.putExtra("com.termux.RUN_COMMAND_SESSION_ACTION", "0");

        try {
            // Termux's RunCommandService is an ordinary background service, so it
            // must not be started with startForegroundService (that would crash
            // because the service never calls startForeground). Hearth is in the
            // foreground while a backup runs, which makes startService allowed.
            ctx.startService(intent);
            JSObject result = new JSObject();
            result.put("started", true);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Could not start Termux: " + e.getMessage());
        }
    }

    /** Opens Termux so the user can finish the one-time setup. */
    @PluginMethod
    public void open(PluginCall call) {
        try {
            Intent intent = getContext().getPackageManager().getLaunchIntentForPackage(TERMUX);
            if (intent == null) {
                call.reject("Termux is not installed");
                return;
            }
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage());
        }
    }

    /** Reports whether Termux is installed and the RUN_COMMAND permission is held. */
    @PluginMethod
    public void status(PluginCall call) {
        JSObject result = new JSObject();
        boolean installed = true;
        try {
            getContext().getPackageManager().getPackageInfo(TERMUX, 0);
        } catch (PackageManager.NameNotFoundException e) {
            installed = false;
        }
        boolean permitted = Build.VERSION.SDK_INT < Build.VERSION_CODES.M
                || getContext().checkSelfPermission(PERMISSION) == PackageManager.PERMISSION_GRANTED;
        result.put("installed", installed);
        result.put("permission", permitted);
        call.resolve(result);
    }
}
