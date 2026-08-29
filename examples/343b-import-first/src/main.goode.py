# Goodecode 0.0.67 — 343B import-first reference project
# @goodecode.schema: 2
# @goodecode.template: 2.1

from typing import Any


def configure_project(ctx: Any) -> None:
    ctx.project(name="Goodebot 343B", team="343B", version="0.67.0", brain_icon="goodecode", default_auton_slot=1)


def configure_robot(ctx: Any) -> None:
    left_drive = ctx.motor_group(id="left_drive", name="Left Drive", ports=[1, 2], gearset="green", role="left_drivetrain", brake="brake")
    right_drive = ctx.motor_group(id="right_drive", name="Right Drive", ports=[-3, -4], gearset="green", role="right_drivetrain", brake="brake")
    floor_intake = ctx.motor(id="floor_intake", name="Floor Intake", port=5, gearset="green", role="mechanism", brake="coast")
    main_arm = ctx.motor_group(id="main_arm", name="Main Arm", ports=[6, -7], gearset="red", role="arm", brake="hold")
    secondary_arm = ctx.motor(id="secondary_arm", name="Secondary Arm", port=8, gearset="red", role="arm", brake="hold")

    # All physical inputs are optional and intentionally blank until the CAD
    # dimensions or real-robot calibration results have been verified.
    ctx.hardware_profile(
        mass_lb=None, length_in=None, width_in=None, height_in=None,
        wheel_diameter_in=None, track_width_in=None, wheelbase_in=None,
        external_gear_ratio=None, traction_coefficient=None, scrub_factor=None,
        left_tracking_port=None, right_tracking_port=None, perpendicular_tracking_port=None,
        effective_wheel_diameter_in=None, effective_track_width_in=None,
    )


def configure_autonomous(ctx: Any) -> None:
    match = ctx.auton_slot(slot=1, name="Match Start", description="Drive, collect, and raise.")
    match.drive_distance(distance=24, units="inches", speed=60)
    match.run_motor(device="floor_intake", speed=100, duration_ms=850)
    match.stop(device="floor_intake")
    match.run_motor(device="main_arm", speed=70, duration_ms=600)
    match.stop(device="main_arm")

    safe = ctx.auton_slot(slot=2, name="Safe Exit", description="Low-risk exit.")
    safe.drive_distance(distance=12, units="inches", speed=45)
    skills = ctx.auton_slot(slot=3, name="Skills Cycle", description="Skills starting point.")
    skills.drive_distance(distance=36, units="inches", speed=65)
    test = ctx.auton_slot(slot=4, name="Mechanism Test", description="Bench test.")
    test.run_motor(device="secondary_arm", speed=55, duration_ms=350)
    test.stop(device="secondary_arm")


def configure_controls(ctx: Any) -> None:
    ctx.tank_drive(left_device="left_drive", right_device="right_drive", left_axis="Axis3", right_axis="Axis2", deadband=5, curve="linear")
    ctx.button_control(button="L1", device="floor_intake", behavior="while_held", command="spin", speed=100)
    ctx.button_control(button="L2", device="floor_intake", behavior="while_held", command="spin", speed=-100)
    ctx.button_control(button="R1", device="main_arm", behavior="while_held", command="spin", speed=80)
    ctx.button_control(button="R2", device="main_arm", behavior="while_held", command="spin", speed=-80)
    ctx.button_control(button="Up", device="secondary_arm", behavior="while_held", command="spin", speed=75)
    ctx.button_control(button="Down", device="secondary_arm", behavior="while_held", command="spin", speed=-75)


def on_initialize(ctx: Any) -> None:
    ctx.status("343B ready — no IMU configured")
