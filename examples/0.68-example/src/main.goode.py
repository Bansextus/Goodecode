"""Goodecode 0.68 reference project.

Declare hardware once, select autonomous behavior in Goodebot Software, and
keep the lifecycle callbacks explicit for Practice and Competition.
"""

from typing import Any

import goode


left_drive = goode.Motor_Group_Dec(
    ports=[1, 2], name="Left Drive", role="leftDrive", brake="brake"
)
right_drive = goode.Motor_Group_Dec(
    ports=[-9, -10], name="Right Drive", role="rightDrive", brake="brake"
)
arm = goode.Motor_Dec(port=5, name="Arm", role="arm", brake="hold")
imu = goode.Sensor_Dec(port=11, name="IMU", sensor="imu")
clamp = goode.Pneumatic_Dec(bank="A", name="Clamp", default=False)


def initialize(ctx: Any) -> None:
    ctx.project_title("Goodecode 0.68 Example")
    ctx.status("Ready")
    ctx.use_brain_icon("goodebot")


def competition_initialize(ctx: Any) -> None:
    ctx.auton_selector(
        title="Autons",
        entries=[
            {"slot": 1, "name": "Match", "folder": "match"},
            {"slot": 2, "name": "Skills", "folder": "skills"},
        ],
        save_to_sd=True,
    )


def autonomous(ctx: Any) -> None:
    if ctx.selected_auton(default="Match") == "Skills":
        ctx.drive_for(24, units="in", speed=70)
        ctx.turn_to_heading(90, speed=60)
    else:
        ctx.drive_for(12, units="in", speed=60)
        ctx.piston_set("Clamp", True)


def opcontrol(ctx: Any) -> None:
    ctx.bind_hold("R1", "Arm", power=80)
    ctx.bind_toggle("L1", "Clamp")
    while ctx.enabled():
        ctx.drive_tank(ctx.axis3(), ctx.axis2())
        ctx.sleep_ms(20)
