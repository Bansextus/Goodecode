/* Goodecode SDK 2 beta, Apache-2.0. Native modules share the firmware address space. */
#ifndef GOODE_SCREEN_H
#define GOODE_SCREEN_H
#include <stdint.h>
#define GOODE_SCREEN_ABI 1u
#define GOODE_SCREEN_WIDTH 480
#define GOODE_SCREEN_HEIGHT 240
/* mode: 0 disabled, 1 autonomous, 2 driver. Missing readings have connected=0. */
typedef struct { uint32_t port, connected; float rpm, voltage; } GoodeMotor;
typedef struct {
 uint32_t abi_version, size, now_ms, mode, field_connected, motor_count;
 GoodeMotor motors[21];
} GoodeTelemetry;
/* Actions refer to existing Cortex screen action IDs; hardware access is not provided. */
typedef struct {
 uint32_t abi_version, size;
 void (*clear)(uint32_t rgb);
 void (*rect)(int32_t x,int32_t y,int32_t w,int32_t h,uint32_t rgb);
 void (*text)(int32_t x,int32_t y,const char *text,uint32_t rgb);
 void (*action)(const char *action_id);
} GoodeScreenHost;
#ifdef __cplusplus
extern "C" {
#endif
void goode_screen_init(const GoodeScreenHost *host);
void goode_screen_frame(const GoodeTelemetry *telemetry);
void goode_screen_touch(int32_t x,int32_t y,uint32_t pressed);
void goode_screen_shutdown(void);
#ifdef __cplusplus
}
#endif
#endif
