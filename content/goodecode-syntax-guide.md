# Goodecode Python Guide

## What Goodecode Is

Goodecode is the Python authoring layer for Goodebot.
You write `.goode.py` files, build a Goodebot runtime, and load that runtime into Goodebot's Brain Preview workflow.
Goodecode Studio can also export a whole Python project into one `.goode` package for importing into Goodebot.

## Standard Workspace

Most projects use these files:

- `Goodecode/src/main.goode.py`
- Goodebot-managed Brain UI Studio screen data after Build Runtime
- `Goodecode/goodecode.toml`
- exported `.goode` package files when you need a single importable file

Use `main.goode.py` for shared robot setup and the separate Practice and Competition callbacks.
Brain UI Studio is no longer created or edited from VS Code. Import the project into Goodebot, press Build Runtime, then use the Goodebot Brain UI Studio editor when the project needs a second screen.

## Runtime Rules

- Keep driver loops running at about `20 ms`.
- Use `ctx.sleep_ms(20)` inside loops instead of blocking waits.
- Keep `initialize()` fast and deterministic.
- Use `Build Runtime` to validate, generate, export the `.goode` package, and open the Goodecode terminal path.
- Import the `.goode` package into Goodebot when you want the Goodebot app to apply Goodebot Runtime and deploy from its locked deployment screen.
- Review `runtime/the big one.md` before deployment when you want the readable report of controls, ports, autons, and screen data.
- Keep the Goodebot icon enabled unless you intentionally change it.

## Main Robot File

```python
from typing import Any


def initialize(ctx: Any) -> None:
    ctx.project_title("My Robot")
    ctx.status("Ready")
    ctx.use_brain_icon("goodebot")


def autonomous(ctx: Any) -> None:
    ctx.status("Autonomous")


def opcontrol(ctx: Any) -> None:
    ctx.status("Driver control")
    while ctx.enabled():
        ctx.sleep_ms(20)
```

## Lifecycle

### `initialize(ctx)`

Use this for startup state:

- project title
- status text
- screen defaults
- hardware setup that should happen once

### `autonomous(ctx)`

Use this for timed autonomous behavior.
Keep actions deterministic and avoid driver-only input reads here.

### `opcontrol(ctx)`

Use this for live control loops.
Most driver code belongs in a `while ctx.enabled():` loop.

## Core Context Calls

- `ctx.project_title("My Robot")`
- `ctx.status("Ready")`
- `ctx.use_brain_icon("goodebot")`
- `ctx.enabled()`
- `ctx.sleep_ms(20)`

## Robot Builder Model

Goodebot now treats every created or imported robot as a Goodecode robot model. The model is saved with the workspace and used when Goodebot generates the runtime. You can configure the same items visually in Goodebot or keep them clear in code.

Main categories:

- drivetrain: left/right drive groups, wheel diameter, external ratio, track width, brake mode, encoder units, IMU, and tracking wheels
- mechanisms: named groups such as arm, lift, intake, clamp, hook, conveyor, PTO, and custom groups
- sensors: IMU, rotation, distance, optical, GPS, vision, ADI analog/digital, encoder, ultrasonic, gyro, and line sensors
- pneumatics: named pistons, ADI banks, default state, toggle/hold behavior
- controller profiles: tank, arcade, split arcade, d-pad, deadband, curves, master/partner controller, button mappings
- auton: selector entries, slots, PID movement blocks, field path data, and tuning constants
- brain screen: exact `480 x 240` preview, labels, widgets, buttons, pages, and touch hitboxes
- deploy: slot, program name, icon, runtime artifact, and upload settings

## Goode And Custom Notation

Goodecode Studio scans Python functions and separates them into two groups:

- goode notation: lifecycle callbacks and context calls Goodebot understands directly
- custom notation: helper functions created by the user that Goodebot preserves and reports before build

Examples of goode notation include:

- `initialize(ctx)`
- `disabled(ctx)`
- `competition_initialize(ctx)`
- `autonomous(ctx)`
- `opcontrol(ctx)`
- `build_info_screen(ctx)`
- `ctx.drive_tank(left, right)`
- `ctx.turn_right(90)`
- `ctx.screen_button(...)`

Any other function, such as `def score_match_loads(ctx):`, is custom notation. Goodebot shows those custom functions in Specs so the user can review what extra code will be included.

## Repository Collection

The Goodecode sidebar can collect a project for GitHub. Select one Goodebot profile, then scan for Goodecode projects:

- Goodecode projects

The collector copies the selected profile and selected source projects into one folder under `Documents/GitHub`.

## Device APIs

Use one-line declarations for hardware. Goodebot imports these without guessing because every line has the device type, connection, name, and role in a consistent shape.

Motors and most V5 sensors use numbered smart ports `1-21`. Pneumatics are different: they use the Brain's ADI letter banks `A-H`, so new pneumatic declarations should use `bank="A"` rather than a numbered motor-style port.

```python
import goode


left_drive = goode.Motor_Group_Dec(ports=[-1, -2], name="Left Drive", role="leftDrive")
right_drive = goode.Motor_Group_Dec(ports=[3, 4], name="Right Drive", role="rightDrive")
arm = goode.Motor_Dec(port=5, name="Arm", role="arm", brake="hold")
imu = goode.Sensor_Dec(port=11, name="IMU", sensor="imu")
clamp = goode.Pneumatic_Dec(bank="A", name="Clamp", default=False)
```

The declaration names are intentionally direct:

- `goode.Motor_Dec(port=1, name="Arm", role="arm")`
- `goode.Motor_Group_Dec(ports=[1, -2], name="Lift", role="lift")`
- `goode.Sensor_Dec(port=11, name="IMU", sensor="imu")`
- `goode.Pneumatic_Dec(bank="A", name="Clamp", default=False)`

`port=` means a numbered V5 smart port. `bank=` means a lettered ADI pneumatic bank. Older pneumatic declarations like `goode.Pneumatic_Dec(port=21, ...)` still load for compatibility, but new projects should not use them because they make a piston look like a normal smart-port device.

Older `ctx.*` device calls still load for compatibility, but new projects should use `goode.*_Dec(...)` lines so the app and the code stay aligned.

Use named device actions when code needs to move declared hardware. Goodebot can generate these names from the Robot Builder, and you can mirror the same intent in `main.goode.py`.

```python
from typing import Any


def configure_robot(ctx: Any) -> None:
    drive_left = ctx.motor_group(ports=[-1, -2, -3], name="Left Drive")
    drive_right = ctx.motor_group(ports=[8, 9, 10], name="Right Drive")
    arm = ctx.motor_group(ports=[4, 5], name="Arm", brake="hold", gearset="36:1")
    clamp = ctx.pneumatic(bank="A", name="Clamp", default=False, toggle=True)
    inertial = ctx.sensor(port=11, kind="imu", name="IMU")
    optical = ctx.sensor(port=12, kind="optical", name="Ring Sensor")
    _ = (drive_left, drive_right, arm, clamp, inertial, optical)
```

Common motor and motor-group intent:

- `ctx.motor(port=1, name="Arm", reversed=False, brake="hold", gearset="36:1")`
- `ctx.motor_group(ports=[1, -2], name="Lift", brake="brake", encoder="degrees")`
- `ctx.move("Arm", power=80)`
- `ctx.move_voltage("Lift", millivolts=9000)`
- `ctx.move_velocity("Conveyor", rpm=120)`
- `ctx.move_absolute("Arm", position=540, velocity=80)`
- `ctx.tare_position("Arm")`
- `ctx.brake("Lift", mode="hold")`
- `ctx.telemetry("Arm")`

Common sensor intent:

- `ctx.sensor(port=11, kind="imu", name="IMU")`
- `ctx.sensor(port=12, kind="rotation", name="Arm Rotation")`
- `ctx.sensor(port=13, kind="distance", name="Front Distance")`
- `ctx.sensor(port=14, kind="optical", name="Color Sensor")`
- `ctx.sensor(port=15, kind="gps", name="GPS")`
- `ctx.adi(port="A", kind="digital_out", name="Clamp")`
- `ctx.adi(port="B", kind="analog_in", name="Line")`

Common pneumatic intent:

- `goode.Pneumatic_Dec(bank="A", name="Clamp", default=False)`
- `ctx.pneumatic(bank="A", name="Clamp", default=False, toggle=True)`
- `ctx.piston_set("Clamp", True)`
- `ctx.piston_toggle("Clamp")`
- `ctx.piston_hold("Clamp", button="R1")`

Pneumatic banks map to the lettered ADI ports on the Brain:

- `A` through `H` are valid pneumatic banks.
- Use one bank per single-acting piston output.
- Use clear names like `"Clamp"`, `"Wing Left"`, or `"PTO"` so controller bindings can target the piston by name.
- Do not put pneumatics in motor groups and do not assign them to smart ports `1-21`.

## Controller APIs

Controller code should describe driver intent, not raw hardware details.

```python
def opcontrol(ctx: Any) -> None:
    ctx.controller_profile(
        drive="split_arcade",
        deadband=5,
        drive_curve=1.25,
        turn_curve=1.10,
        partner=False
    )
    ctx.bind_hold("R1", "Intake", power=100)
    ctx.bind_hold("R2", "Intake", power=-100)
    ctx.bind_toggle("L1", "Clamp")

    while ctx.enabled():
        ctx.opcontrol_arcade_standard(split=True)
        ctx.sleep_ms(20)
```

Useful controller calls:

- `ctx.axis("left_y")`, `ctx.axis("right_x")`
- `ctx.button("R1")`
- `ctx.button_pressed("A")`
- `ctx.rumble(".-")`
- `ctx.controller_text(line=1, text="Ready")`
- `ctx.bind_hold("R1", "Arm", power=80)`
- `ctx.bind_toggle("L1", "Clamp")`
- `ctx.bind_press("X", callback="next_auton")`

## Controls And Movement

Goodecode projects should make control intent obvious and keep movement logic inside the driver loop.

## Chassis API

Goodecode has a Python-first chassis layer for the EZ-style workflow directly in Goodecode.
Goodebot writes these calls from Studio so the visual robot model and `main.goode.py` stay aligned.

### Chassis Setup

```python
from typing import Any


def initialize(ctx: Any) -> None:
    chassis = ctx.chassis(
        left_ports=[1, 2, 3],
        right_ports=[8, 9, 10],
        imu_port=11
    )
    ctx.project_title("My Robot")
    ctx.status("Ready")
```

### Driver Helpers

- `ctx.drive_mode("TANK" | "ARCADE_2_STICK" | "DPAD", inverted=False)`
- `ctx.set_drive_mode("tank" | "arcade" | "dpad")`
- `ctx.set_drive_inverted(True | False)`
- `ctx.toggle_drive_inverted()`
- `ctx.drive_set(left, right)`
- `ctx.drive_tank(left, right)`
- `ctx.drive_arcade(forward, turn)`
- `ctx.opcontrol_tank()`
- `ctx.opcontrol_arcade_standard(split=True)`
- `ctx.stop_drive()`
- `ctx.drive_brake_set("hold" | "coast" | "brake")`

### Motion Helpers

- `ctx.drive_for(distance, units="in", speed=80)`
- `ctx.drive_inches(distance, speed=80, heading_lock=True)`
- `ctx.turn_for(degrees, units="deg", speed=70)`
- `ctx.turn_degrees(degrees, speed=70)`
- `ctx.drive_ms(duration_ms, power=80)`
- `ctx.set_pose(x=36, y=36, heading=0)`
- `ctx.drive_to_point(x=48, y=72, speed=80)`
- `ctx.turn_to_heading(90, speed=70)`
- `ctx.arc(radius_in=18, degrees=90, direction="right", speed=70)`
- `ctx.arc_to_point(x=72, y=48, radius_in=24, direction="left", speed=70)`
- `ctx.pid_drive_set(distance, speed, slew=True)`
- `ctx.pid_turn_set(degrees, speed)`
- `ctx.pid_swing_set(side, degrees, speed)`
- `ctx.pid_wait()`
- `ctx.pid_targets_reset()`
- `ctx.drive_imu_reset()`
- `ctx.drive_sensor_reset()`

### Auton Block Movement Types

Goodebot Auton Blocks now map to these Goodecode movement calls.

- Set Pose: `ctx.set_pose(x=36, y=36, heading=0)`
- Drive Forward / Backward: `ctx.drive_for(24, units="in", speed=80)`
- Drive To Point: `ctx.drive_to_point(x=48, y=72, speed=80)`
- Turn Left / Right: `ctx.turn_for(90, units="deg", speed=70)`
- Swing Left / Right: `ctx.pid_swing_set(side="left", degrees=45, speed=65)`
- Turn To Heading: `ctx.turn_to_heading(180, speed=70)`
- Arc: `ctx.arc(radius_in=18, degrees=90, direction="right", speed=70)`
- Arc To Point: `ctx.arc_to_point(x=72, y=48, radius_in=24, direction="left", speed=70)`
- Wait and mechanism blocks still use the same timed calls as before.

For field drawing on a 6 x 6 ft canvas, use inches from the lower-left corner: `0` to `72` for both X and Y. For a full VEX field preview, Goodebot also accepts coordinates up to `144`.

## Auton Selector

Goodecode supports a slot-based autonomous selector that matches the Goodebot brain-screen preview and generated runtime.

```python
def competition_initialize(ctx: Any) -> None:
    ctx.auton_selector(
        title="Autons",
        entries=[
            {"slot": 1, "name": "Skills", "folder": "skills"},
            {"slot": 2, "name": "Red Side", "folder": "red"},
            {"slot": 3, "name": "Blue Side", "folder": "blue"},
        ],
        save_to_sd=True
    )


def autonomous(ctx: Any) -> None:
    selected = ctx.selected_auton(default="Skills")
    if selected == "Skills":
        ctx.drive_for(24, units="in", speed=80)
    elif selected == "Red Side":
        ctx.turn_to_heading(90, speed=70)
```

Related calls:

- `ctx.auton_selector(title, entries, save_to_sd=True)`
- `ctx.selected_auton(default="Skills")`
- `ctx.auton_slot()`
- `ctx.auton_folder()`
- `ctx.save_auton_selection()`
- `ctx.load_auton_selection()`

## Brain Screen And Touch

The Goodebot screen editor uses a fixed `480 x 240` brain canvas. Keep hitboxes large enough for real fingers, and avoid placing labels on top of buttons.

```python
def build_info_screen(ctx: Any) -> None:
    ctx.screen_page("Main")
    ctx.title("Goodecode")
    ctx.label(x=16, y=24, text="Ready", size="large")
    ctx.status_widget(x=16, y=58, source="battery")
    ctx.button(
        id="save_sd",
        text="Save SD",
        x=24,
        y=184,
        width=132,
        height=38,
        action="save_auton_selection"
    )
```

Useful screen calls:

- `ctx.screen_page("Main")`
- `ctx.title("Robot Name")`
- `ctx.label(x, y, text, size="normal")`
- `ctx.button(id, text, x, y, width, height, action)`
- `ctx.status_widget(x, y, source="battery" | "sd" | "brain" | "auton")`
- `ctx.touch_hitbox(id, x, y, width, height)`
- `ctx.on_touch(id, callback)`

## SD And Deploy

Goodebot can require SD data before build/upload so port maps, controller maps, auton selections, and screen/runtime files stay synchronized.

```python
def initialize(ctx: Any) -> None:
    ctx.require_sd_card(True)
    ctx.deploy_contract(slot=1, program_name="My Robot", upload_after_build=True)
    ctx.write_sd_runtime("goodebot_project.json")
    ctx.validate_sd_runtime()
```

Deploy calls:

- `ctx.require_sd_card(True)`
- `ctx.deploy_contract(slot=1, program_name="My Robot", upload_after_build=True)`
- `ctx.write_sd_runtime("goodebot_project.json")`
- `ctx.validate_sd_runtime()`
- `ctx.sd_read("auton_slot.txt")`
- `ctx.sd_write("auton_slot.txt", "1")`
- `ctx.battery_voltage()`
- `ctx.competition_state()`

### Pose / Odom Helpers

- `ctx.odometry(enabled=True, lookahead_in=7.5, boomerang_dlead=0.6)`
- `ctx.odom_xyt_set(x, y, heading)`
- `ctx.set_pose(x, y, heading)`
- `ctx.get_pose()`
- `ctx.pure_pursuit(points, lookahead_in=7.5)`
- `ctx.odom_turn_bias_set(value)`
- `ctx.odom_look_ahead_set(distance)`
- `ctx.odom_boomerang_distance_set(distance)`
- `ctx.odom_boomerang_dlead_set(value)`

### Tuning Helpers

- `ctx.robot_profile(weight_lb=18, wheel_diameter_in=3.25, drive_gear_ratio=1.0, track_width_in=12.5)`
- `ctx.auton_tuning(drive_distance_scale=1.0, turn_scale=1.0, max_accel=0.65, brake_strength=0.42)`
- `ctx.pid_drive_constants_set(kp=0.45, ki=0.0, kd=1.8)`
- `ctx.pid_heading_constants_set(...)`
- `ctx.pid_turn_constants_set(kp=1.15, ki=0.0, kd=4.2)`
- `ctx.pid_swing_constants_set(...)`
- `ctx.pid_odom_angular_constants_set(...)`
- `ctx.pid_odom_boomerang_constants_set(...)`
- `ctx.pid_drive_exit_condition_set(error=0.75, settle_ms=180, timeout_ms=2500)`
- `ctx.pid_turn_exit_condition_set(error=1.5, settle_ms=180, timeout_ms=2500)`
- `ctx.pid_swing_exit_condition_set(...)`
- `ctx.pid_odom_drive_exit_condition_set(...)`
- `ctx.pid_odom_turn_exit_condition_set(...)`
- `ctx.pid_drive_chain_constant_set(...)`
- `ctx.pid_turn_chain_constant_set(...)`
- `ctx.pid_swing_chain_constant_set(...)`
- `ctx.slew_drive_constants_set(rate=0.62)`
- `ctx.slew_turn_constants_set(...)`
- `ctx.slew_swing_constants_set(...)`
- `ctx.pid_angle_behavior_set("shortest" | "raw")`

### Hardware Profile And Auton Tuning

Robot weight, wheel geometry, gearing, dimensions, sensor mounts, and calibration facts are configured in Goodebot's Hardware section. Blank Hardware fields are omitted from Goodebot Runtime math. GoodeCode owns only software behavior and expert overrides.

```python
from typing import Any


def initialize(ctx: Any) -> None:
    ctx.auton_tuning(
        drive_distance_scale=1.00,
        turn_scale=1.00,
        max_accel=0.65,
        brake_strength=0.42,
        heading_hold_kp=0.35,
        drift_correction=1.00,
        left_drive_bias=1.00,
        right_drive_bias=1.00
    )
```

Legacy `ctx.robot_profile(...)` calls can be imported into Hardware review, but their values remain unconfirmed and are not used until the user confirms them. Use guided Hardware calibration to produce final measured values.

Recommended calibration:

- Drive forward `24 in`, measure actual travel, then save `drive_distance_scale`.
- Turn `90 deg`, measure actual turn, then save `turn_scale`.
- Increase `max_accel` only until wheel slip starts, then back it down.
- Increase `brake_strength` only until the robot stops cleanly without bouncing.
- Drive straight `48 in`, measure side drift, then tune heading hold and left/right bias.
- Recalibrate when battery, wheels, drivetrain, or robot weight changes.

### Auton Drift Correction

Drift happens when the robot does not travel in the direction the auton block expected.
The most common causes are uneven weight, different motor output, wheel scrub, battery sag, field tile seams, and one side of the drivetrain gripping harder than the other.

Goodecode should correct drift inside movement blocks instead of asking teams to guess a longer timed command.

Use heading-locked distance blocks:

```python
def autonomous(ctx: Any) -> None:
    ctx.drive_inches(
        48,
        speed=70,
        heading_lock=True,
        target_heading=ctx.heading()
    )
```

When `heading_lock=True`, the runtime compares the intended heading to the IMU heading during the move.
It adds a small correction to one side of the drivetrain and subtracts it from the other:

```text
heading_error = target_heading - current_heading
correction = heading_error * heading_hold_kp
left_power = base_power + correction
right_power = base_power - correction
```

Use bias values when the robot consistently drifts the same way even with heading hold:

```python
def initialize(ctx: Any) -> None:
    ctx.auton_tuning(
        heading_hold_kp=0.38,
        drift_correction=1.05,
        left_drive_bias=0.98,
        right_drive_bias=1.02
    )
```

Auton Blocks should expose these as robot-level tuning values:

- `Heading Hold`: how strongly the robot fights angle drift.
- `Drift Correction`: overall straight-line correction strength.
- `Left Bias`: trims the left drive side.
- `Right Bias`: trims the right drive side.
- `Settle Time`: how long the robot waits after a corrected move.

Recommended drift calibration:

- Reset the IMU and drive sensors.
- Drive `48 in` at match battery level.
- Measure how far left or right the robot ended.
- If the robot arcs, adjust `heading_hold_kp`.
- If one side is always stronger, adjust `left_drive_bias` or `right_drive_bias`.
- Re-test at the speed used in the real auton block.

Use timed blocks only for simple mechanisms or emergency fallback.
For drivetrain movement, prefer corrected distance and turn blocks.

Prefer distance and heading commands when possible:

```python
def autonomous(ctx: Any) -> None:
    ctx.drive_inches(24, speed=80)
    ctx.turn_degrees(90, speed=70)
    ctx.drive_inches(-8, speed=60)
```

Timed drive still works, but it is less repeatable:

```python
def autonomous(ctx: Any) -> None:
    ctx.drive_ms(700, power=80)
```

### Starter Direction

- Keep the default starter focused on lifecycle, screen, and drive.
- Do not assume six-wheel toggles in the default template.
- Do not assume GPS in the default template.
- Only add intake, outake, pneumatics, and other mechanism helpers when the project actually uses them.

### Tank Drive Pattern

```python
from typing import Any


def opcontrol(ctx: Any) -> None:
    while ctx.enabled():
        left = ctx.axis3()
        right = ctx.axis2()
        ctx.drive_tank(left, right)
        ctx.sleep_ms(20)
```

### Arcade Drive Pattern

```python
from typing import Any


def opcontrol(ctx: Any) -> None:
    while ctx.enabled():
        forward = ctx.axis3()
        turn = ctx.axis1()
        ctx.drive_arcade(forward, turn)
        ctx.sleep_ms(20)
```

### Timed Movement Pattern

```python
from typing import Any


def autonomous(ctx: Any) -> None:
    ctx.drive_tank(80, 80)
    ctx.sleep_ms(700)
    ctx.drive_tank(0, 0)
```

### Turn Pattern

Use explicit direction in code so the intent is easy to audit:

```python
from typing import Any


def turn_right(ctx: Any, degrees: float = 90) -> None:
    ctx.status(f"Turn right {degrees} deg")
    ctx.turn_right(degrees)


def turn_left(ctx: Any, degrees: float = 90) -> None:
    ctx.status(f"Turn left {degrees} deg")
    ctx.turn_left(degrees)
```

### Controller Buttons

```python
from typing import Any


def opcontrol(ctx: Any) -> None:
    while ctx.enabled():
        if ctx.button_r1():
            ctx.intake(100)
        elif ctx.button_r2():
            ctx.intake(-100)
        else:
            ctx.intake(0)
        ctx.sleep_ms(20)
```

## Brain Screen File

```python
def build_info_screen(ctx):
    ctx.title("My Robot")
    ctx.info("Goodecode")
    ctx.hardware_status()
    ctx.allow_project_ui_switch(True)
```

## Default Screen Rules

- Show the Goodebot info screen first.
- Show project title and hardware state.
- Only show the page switcher if a custom UI exists.
- Keep the default Goodebot screen reachable after switching pages.

## One-Script Template

Use the one-script starter only if you intentionally want a compact single file.

```python
from typing import Any


def when_started(ctx: Any) -> None:
    ctx.project_title("My Robot")
    ctx.use_brain_icon("goodebot")
    ctx.status("One-script file ready")


def pre_auton(ctx: Any) -> None:
    pass


def autonomous(ctx: Any) -> None:
    pass


def opcontrol(ctx: Any) -> None:
    while ctx.enabled():
        ctx.sleep_ms(20)
```

## Goodecode Starter

The Goodecode starter is the built-in reference project beside your workspace.
Use it to compare structure, screen patterns, and starter function layout.

## Dual Program Deployment

Goodecode and Goodebot share a versioned deployment model at:

```text
runtime/goodebot_deployment.json
```

Declare the Practice and Competition Brain programs in Goodecode:

```python
def configure_robot(ctx):
    ctx.program_profile(
        kind="practice",
        name="Tahera Practice",
        slot=1,
    )
    ctx.program_profile(
        kind="competition",
        name="Tahera Competition",
        slot=2,
        auton="Left Rush",
    )
    ctx.auton_routine(
        name="Left Rush",
        steps=["drive 24", "turn 90", "drive 12"],
    )
```

The Practice program includes touch pages and the built-in 15-second autonomous plus 105-second driver simulation. The Competition program is read-only, uses the selected auton, and follows the real field controller. Both controller screens show the active phase and time remaining.

Goodebot checks the connected Brain firmware before upload. VEXos 1.1.5 or newer is required; a missing, unreadable, or older firmware version blocks upload while still allowing offline builds.

## Build And Test Flow

1. Edit `main.goode.py`.
2. Edit the selected mode's `practice_brain_screen` or `competition_brain_screen` function in `main.goode.py` for Brain UI changes.
3. Review `runtime/goodebot_deployment.json`.
4. Open Goodebot.
5. Configure the two program slots and Competition auton.
6. Build or upload the selected program, or build and upload both.

## Competition Note

Goodecode stays on the native Goodebot runtime path for authoring.
If you need official event compliance, verify the current event rules and your allowed deployment path before match use.
