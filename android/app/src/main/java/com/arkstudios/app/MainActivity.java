package com.arkstudios.app;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        // Draw behind the system bars on every Android version, as Capacitor's SystemBars plugin
        // expects (Android 15+ does this anyway). The page keeps content clear with safe-area insets.
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);
    }
}
