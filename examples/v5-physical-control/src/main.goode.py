# Goodecode physical V5 example — edit these declarations to match your wiring.
# @goodecode.schema: 2
# @goodecode.name: V5 Physical Control Example
#
# Smart ports: 1,2 left drive; 3,4 right drive; 5 intake; 6 arm.
# Negative ports reverse a motor. ADI A controls the clamp solenoid.
# Voltage limits are millivolts: 6000 = 6 V, 4000 = 4 V.
# Driver: left/right sticks = tank drive; L1/L2 = intake; R1/R2 = arm;
# A toggles the clamp. Autonomous physically moves the robot for 500 ms.

from typing import Any


def initialize(ctx: Any) -> None:
    ctx.project_title("V5 Physical Control Example")
    ctx.status("Ready")
    configure_robot(ctx)
    configure_programs(ctx)


def configure_robot(ctx: Any) -> None:
    left = ctx.motor_group(name="Left Drive", ports=[1, 2], role="leftDrive", gearset="green", brake="brake", voltage_limit_mv=6000, voltage_limits_mv={"1": 6000, "2": 6000})
    right = ctx.motor_group(name="Right Drive", ports=[-3, -4], role="rightDrive", gearset="green", brake="brake", voltage_limit_mv=6000)
    intake = ctx.motor(name="Intake", port=5, reversed=False, role="intake", gearset="green", brake="coast", voltage_limit_mv=6000)
    arm = ctx.motor(name="Arm", port=6, reversed=False, role="arm", gearset="red", brake="brake", voltage_limit_mv=4000)
    clamp = ctx.pneumatic(name="Clamp", bank="A", default=False, toggle=True)
    ctx.drive_mode("TANK", inverted=False)


def configure_programs(ctx: Any) -> None:
    ctx.program_profile(kind="practice", name="Example Practice", slot=1, auton="Practice Auton", autonomous="practice_autonomous", driver_control="practice_driver_control", brain_screen="practice_brain_screen", allow_test_actions=True, allow_auton_selection=True)
    ctx.auton_routine(name="Practice Auton", slot=1, callback="practice_autonomous")
    ctx.program_profile(kind="competition", name="Example Competition", slot=2, auton="Competition Auton", autonomous="competition_autonomous", driver_control="competition_driver_control", brain_screen="competition_brain_screen", allow_test_actions=False, allow_auton_selection=False)
    ctx.auton_routine(name="Competition Auton", slot=1, callback="competition_autonomous")


def practice_autonomous(ctx: Any) -> None:
    ctx.call_imported_function("example_autonomous")


def competition_autonomous(ctx: Any) -> None:
    ctx.call_imported_function("example_autonomous")


def example_autonomous(ctx: Any) -> None:
    ctx.status("Autonomous: clamp, drive, intake")
    ctx.pneumatic_on(name="Clamp", duration_ms=250)
    ctx.motor_group_command(name="Left Drive", command="move", power=25)
    ctx.motor_group_command(name="Right Drive", command="move", power=25)
    ctx.wait_ms(500)
    ctx.motor_group_command(name="Left Drive", command="stop")
    ctx.motor_group_command(name="Right Drive", command="stop")
    ctx.run_motor(device="Intake", speed=30, duration_ms=300)
    ctx.pneumatic_off(name="Clamp")
    ctx.status("Autonomous complete")


# Cortex repeats each driver callback while driver control is enabled.
# Bindings belong here; do not add an infinite Python loop.
def practice_driver_control(ctx: Any) -> None:
    ctx.tank_drive(left_device="Left Drive", right_device="Right Drive", left_axis="left_y", right_axis="right_y", deadband=5)
    ctx.bind_motor_group(name="Intake buttons", motors=["Intake"], forward_button="L1", reverse_button="L2", power=50)
    ctx.bind_motor_group(name="Arm buttons", motors=["Arm"], forward_button="R1", reverse_button="R2", power=25)
    ctx.button_control(button="A", device="Clamp", behavior="toggle", command="pneumatic")
    ctx.sleep_ms(20)


def competition_driver_control(ctx: Any) -> None:
    ctx.tank_drive(left_device="Left Drive", right_device="Right Drive", left_axis="left_y", right_axis="right_y", deadband=5)
    ctx.bind_motor_group(name="Intake buttons", motors=["Intake"], forward_button="L1", reverse_button="L2", power=50)
    ctx.bind_motor_group(name="Arm buttons", motors=["Arm"], forward_button="R1", reverse_button="R2", power=25)
    ctx.button_control(button="A", device="Clamp", behavior="toggle", command="pneumatic")
    ctx.sleep_ms(20)


def practice_brain_screen(ctx: Any) -> None:
    ctx.screen_page(name="Practice", role="practice")
    ctx.title("V5 Physical Example")
    ctx.info("Tank drive | A: clamp")
    ctx.hardware_status()


def competition_brain_screen(ctx: Any) -> None:
    ctx.screen_page(name="Competition", role="competition")
    ctx.title("V5 Competition Example")
    ctx.info("Waiting for field control")
    ctx.hardware_status()
