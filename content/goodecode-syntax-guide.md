# Goodecode 1.0.2 — Syntax Guide

Goode>Good

Goodecode authors `.goode.py` source and exports `.goode` packages. Goodebot validates, compiles, seals, and deploys them to compatible VEX V5 hardware. The source uses Python syntax, but the deployed program executes supported context operations; it is not a general Python interpreter.

## Project layout and workflow

```text
goodecode.toml
src/main.goode.py
```

1. Open the project folder in VS Code.
2. Use **Check Project** for authoring checks.
3. Use **Export for Goodebot** to create a `.goode` package.
4. Import it in Goodebot. Review Hardware, Software, and Programs, then Build and Deploy.

Goodecode's authoring checks do not replace Goodebot's compiler or hardware checks. Current projects use named program profiles and autonomous callbacks. They do not require four legacy `auton_slot()` calls. Avoid legacy `ctx.project()`, `ctx.auton_slot()`, and `high.*` commands.

## Complete minimal project

Edit ports, motor reversals, wheel geometry, and program slots to match the robot. Distances below are inches.

```python
# @goodecode.schema: 2
from typing import Any


def initialize(ctx: Any) -> None:
    ctx.project_title("My Robot")
    configure_robot(ctx)
    configure_programs(ctx)


def configure_robot(ctx: Any) -> None:
    ctx.motor_group(name="Left Drive", ports=[1, 2], role="leftDrive", gearset="green", brake="brake")
    ctx.motor_group(name="Right Drive", ports=[-3, -4], role="rightDrive", gearset="green", brake="brake")
    ctx.motor(name="Intake", port=5, role="intake", gearset="green", brake="coast")
    ctx.pneumatic(name="Clamp", bank="A", default=False, toggle=True)
    ctx.drivetrain_ports(left_ports=[1, 2], right_ports=[3, 4], wheel_diameter=3.25, gear_ratio=1.0, track_width=12.5, units="in")
    # An IMU declaration is required. Assign port=8 when physically installed.
    ctx.imu(name="Drive IMU", required=False)
    ctx.drive_mode("TANK", inverted=False)


def configure_programs(ctx: Any) -> None:
    ctx.program_profile(kind="practice", name="My Robot Practice", slot=1, auton="Main", autonomous="autonomous", driver_control="driver", brain_screen="brain", allow_test_actions=True, allow_auton_selection=True)
    ctx.program_profile(kind="competition", name="My Robot Competition", slot=2, auton="Main", autonomous="autonomous", driver_control="driver", brain_screen="brain", allow_test_actions=False, allow_auton_selection=False)
    ctx.auton_routine(name="Main", slot=1, callback="autonomous")


def autonomous(ctx: Any) -> None:
    ctx.status("Drive 24 inches")
    ctx.drive_for(24, units="in", speed=50)
    ctx.run_motor(device="Intake", speed=30, duration_ms=300)
    ctx.pneumatic_on(name="Clamp")


def driver(ctx: Any) -> None:
    ctx.tank_drive(left_device="Left Drive", right_device="Right Drive", left_axis="left_y", right_axis="right_y", deadband=5)
    ctx.button_control(button="L1", device="Intake", behavior="while_held", command="spin", speed=100)
    ctx.button_control(button="A", device="Clamp", behavior="toggle", command="pneumatic")
    ctx.sleep_ms(20)


def brain(ctx: Any) -> None:
    ctx.screen_page(name="Robot", role="practice")
    ctx.title("My Robot")
    ctx.hardware_status()
```

Goodebot schedules the driver callback while Driver mode is enabled. Declare bindings there and yield with `sleep_ms(20)`; do not add an infinite Python loop.

## Hardware and power

| Operation | Example / meaning |
|---|---|
| `motor` | One signed Smart Port; negative reverses the motor. |
| `motor_group` | A named list of signed ports, all operated together. |
| `gearset` | `red` = 100 RPM, `green` = 200 RPM, `blue` = 600 RPM. |
| `brake` | `coast`, `brake`, or `hold`. |
| `voltage_limit_mv` | Group limit, 0–12000 millivolts. |
| `voltage_limits_mv` | Per-port limits, e.g. `{"1": 6000, "2": 9000}`. |
| `current_limit_ma` | Motor current limit, 0–2500 mA. |
| `pneumatic` | Named on-brain ADI bank A–H; optional `expander_port` for an ADI expander. |

Motor `power`/`speed` commands use percentage output. Goodebot's controller speed-limit sliders use 0–127. Do not confuse those scales with volts or cartridge RPM.

```python
ctx.motor_group_command(name="Intake", command="move", power=50)
ctx.wait_ms(500)
ctx.motor_group_command(name="Intake", command="stop")
ctx.motor_group_command(name="Intake", command="voltage", voltage=6.0)
```

`move` starts output without waiting. `run_motor(device=..., speed=..., duration_ms=...)` runs for a bounded duration and then stops. Empty physical motor ports are skipped and reported; invalid declarations and other execution errors still require correction. Field disable stops motor output.

## Drive geometry, RPM, and the IMU

Configure wheel diameter and wheel RPM in Create's Drive Profile, or edit the corresponding source geometry. `gear_ratio` means **motor revolutions per wheel revolution**:

```text
gear_ratio = cartridge RPM / wheel RPM
travel per motor revolution = pi × wheel diameter / gear_ratio
```

A 200 RPM motor driving 400 RPM wheels has a ratio of 0.5. Adding drive motors does not multiply distance per wheel revolution.

Declare the IMU in `configure_robot`:

```python
ctx.imu(name="Drive IMU", port=8, required=False)
```

When connected and ready, it supplies measured heading correction and turn feedback. When physically absent, motion falls back to encoders and configured geometry. `ctx.imu(name="Drive IMU", required=False)` declares an unassigned IMU. Encoder fallback cannot observe wheel slip or replace a working IMU's heading measurements.

```python
ctx.set_pose(x=24, y=36, heading=90)
ctx.drive_for(12, units="in", speed=50, timeout_ms=4000)
ctx.turn_for(90, speed=35, timeout_ms=4000)
ctx.turn_to_heading(heading=180, speed=35, timeout_ms=4000)
```

Missing wheel geometry blocks distance deployment before upload. Track width is required for turning geometry. Position-navigation commands such as `drive_to_point` and `arc_to_point` require a physical localization implementation and are not a replacement for supported distance/turn commands.

## Custom functions and source-managed sensors

Other sensor declarations and conditions belong in Goodecode source/custom functions, not Goodebot's block palette. Helpers must be named functions, invoked through a supported call:

```python
# Add inside configure_robot:
# ctx.sensor_dec(name="Front Range", port=9, sensor="distance")


def check_front_range(ctx: Any) -> None:
    ctx.sensor_command(command="if", name="Front Range", metric="distance_mm", comparison="<", value=150)
    ctx.motor_group_command(name="Intake", command="stop")
    ctx.sensor_command(command="else")
    ctx.motor_group_command(name="Intake", command="move", power=40)
    ctx.sensor_command(command="end_if")

# Call from autonomous:
# ctx.call_imported_function("check_front_range")
```

Use one `end_if` for each `if`; `else` is optional. Comparisons: `<`, `<=`, `>`, `>=`, `==`, `!=`. Missing detections are not treated as a distance of zero. A disconnected required sensor read reports an error.

`ctx.wait_until(name="Front Range", metric="distance_mm", comparison="<", value=150, timeout_ms=2000)` waits with a bounded timeout and remains interruptible by field disable.

| Sensor token | Available readings |
|---|---|
| `distance` | `distance_mm`, `detected` |
| `rotation` | `position_deg`, `angle_deg` |
| `optical` | `hue_deg`, `proximity`, `brightness`, `saturation` |
| `imu` / `inertial` | `heading_deg`, `rotation_deg` |
| `gps` | `x_m`, `y_m`, `heading_deg` |
| `vision` | `object_count`, `object_width`, `object_height` |
| `ai_vision` | `object_count`, `object_id` |

Optical proximity/light readings use 0–1. Vision signatures must be configured on the sensor. These are the supported smart-sensor readings; arbitrary ADI sensors and arbitrary Python sensor code are not implied.

## Practice and Competition

Practice starts in Driver control. Its Start action or configured controller shortcut starts the simulated match sequence. Competition follows field-control or the VEX controller's Timed Run/Match state; it does not start autonomous just because the program launches. Autonomous selection is interactive in Practice and preselected for Competition.

## Capture the physical Brain screen

Use **Capture Brain Screen** in the sidebar or **Goodecode: Capture Connected Brain Screen** in the Command Palette. Choose a PNG destination; the capture opens in VS Code. This reads the screen without deploying or running a program.

Connect the V5 Brain by USB and use the updated Goodebot app's capture helper. macOS locates `/Applications/Goodebot.app` automatically. For a different installation/platform, set the user-level **Goodecode: Brain Capture Executable** path. Close other serial applications if the Brain port is busy. Capturing requires a trusted local VS Code workspace.
