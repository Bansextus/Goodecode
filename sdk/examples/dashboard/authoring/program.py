import json
print(json.dumps({'schemaVersion': 1, 'name': 'Native Dashboard', 'configuration': [{'op': 'imu', 'args': {'name': 'Drive IMU', 'port': 21, 'required': False}}], 'autonomous': [{'op': 'status', 'args': {'message': 'Custom dashboard auton'}}, {'op': 'wait_ms', 'positional': [1000], 'args': {}}], 'driver': []}))
