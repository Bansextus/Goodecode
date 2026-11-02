# V5 physical control example

Open this folder in VS Code with the current Goodecode extension, or import
`src/main.goode.py` into the rebuilt Goodebot app. Goodebot builds and uploads the
physical runtime; running this file with ordinary Python does not control a Brain.

Edit the motor ports and reversal to match your robot before uploading.

| Connection | Device | Voltage cap |
| --- | --- | --- |
| Smart 1, 2 | Left drive, green cartridges | 6 V each |
| Smart 3, 4 | Right drive, reversed, green cartridges | 6 V each |
| Smart 5 | Intake, green cartridge | 6 V |
| Smart 6 | Arm, red cartridge | 4 V |
| Brain ADI A | Clamp solenoid | Digital output |

Practice uses Brain slot 1. Competition uses slot 2 and locks test controls and
selection. Tank steering uses the two sticks, L1/L2 runs the intake, R1/R2 runs the
arm, and A toggles the clamp. Autonomous extends the clamp, drives both sides at
25% for 500 ms, stops the drivetrain, runs the intake briefly, and retracts the
clamp. The example commands physical movement when autonomous is enabled.

This example uses timed movement so it does not assume wheel dimensions or a
heading sensor. For distance-based autonomous actions, supply your real wheel,
gear-ratio, and track-width measurements in Goodebot first. Verify hardware and
field transitions before using a robot at an event.
