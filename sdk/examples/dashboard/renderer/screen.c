#include "goode_screen.h"
static const GoodeScreenHost *h;
static unsigned page;
void goode_screen_init(const GoodeScreenHost *host) { h=host; page=0; }
void goode_screen_touch(int32_t x,int32_t y,uint32_t pressed) {
 (void)x; (void)y; if(pressed) page^=1;
}
void goode_screen_shutdown(void) { h=0; }
void goode_screen_frame(const GoodeTelemetry *t) {
 h->clear(0x061525);
 float energy=0;
 for(unsigned i=0;i<t->motor_count;i++) if(t->motors[i].connected) {
  float rpm=t->motors[i].rpm; energy+=(rpm<0?-rpm:rpm)/200.0f;
 }
 if(energy>1) energy=1;
 unsigned glow=80+(unsigned)(175*energy);
 h->rect(0,0,480,4,(glow<<8)|glow);
 h->text(24,22,"Goodecode 2 / Native screen",0xFFD454);
 h->text(24,52,t->mode==1?"AUTONOMOUS":t->mode==2?"DRIVER":"DISABLED",0xFFFFFF);
 h->text(24,78,t->field_connected?"FIELD CONNECTED":"NO FIELD",0x59E3C1);
 if(page) {
  for(unsigned i=0;i<t->motor_count && i<7;i++) {
   float rpm=t->motors[i].rpm; if(rpm<0) rpm=-rpm;
   int w=(int)(rpm*1.5f); if(w>420) w=420;
   h->rect(24,110+(int)i*13,w,8,t->motors[i].connected?0x26D8F4:0xDD6476);
  }
 } else {
  int x=24+(int)((t->now_ms/8)%400);
  h->rect(x,128,32,32,0xFFD454);
  h->rect(24,180,(int)(energy*420),10,0x26D8F4);
 }
 h->text(24,215,"Tap anywhere to change page",0xB8D3E4);
}
