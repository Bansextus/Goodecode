#define _POSIX_C_SOURCE 200809L
#include "goode_screen.h"
#include <stdio.h>
#include <string.h>
#include <time.h>
#include <unistd.h>
#include <fcntl.h>
#include <stdlib.h>
static unsigned char pixels[480*240*3];
static void rect(int32_t x,int32_t y,int32_t w,int32_t h,uint32_t c) {
 for(int j=y<0?0:y;j<y+h && j<240;j++) for(int i=x<0?0:x;i<x+w && i<480;i++) {
  unsigned k=(j*480+i)*3; pixels[k]=c>>16; pixels[k+1]=c>>8; pixels[k+2]=c;
 }
}
static void clear(uint32_t c) {rect(0,0,480,240,c);}
/* Small deterministic 5x7 font supplied by the preview host; native uses V5 text. */
static void text(int32_t x,int32_t y,const char *s,uint32_t c) {
 static const unsigned char font[][5]={
 {126,17,17,17,126},{127,73,73,73,54},{62,65,65,65,34},{127,65,65,34,28},
 {127,73,73,73,65},{127,9,9,9,1},{62,65,73,73,122},{127,8,8,8,127},
 {0,65,127,65,0},{32,64,65,63,1},{127,8,20,34,65},{127,64,64,64,64},
 {127,2,12,2,127},{127,4,8,16,127},{62,65,65,65,62},{127,9,9,9,6},
 {62,65,81,33,94},{127,9,25,41,70},{70,73,73,73,49},{1,1,127,1,1},
 {63,64,64,64,63},{31,32,64,32,31},{127,32,24,32,127},{99,20,8,20,99},
 {7,8,112,8,7},{97,81,73,69,67}};
 for(unsigned n=0;s[n] && n<80;n++,x+=6) {
  unsigned char v=s[n]; if(v>='a'&&v<='z') v-=32;
  if(v>='A'&&v<='Z') for(int col=0;col<5;col++) for(int row=0;row<7;row++) if(font[v-'A'][col]&(1<<row)) rect(x+col,y+row,1,1,c);
 }
}
static void action(const char *s) {fprintf(stderr,"Preview action (not executed): %.128s\n",s);}
int main(int argc,char **argv) {
 GoodeScreenHost host={1,sizeof(host),clear,rect,text,action};
 GoodeTelemetry t={0}; t.abi_version=1;t.size=sizeof(t);t.mode=2;t.motor_count=2;
 t.motors[0].port=1;t.motors[1].port=2;
 goode_screen_init(&host); fcntl(0,F_SETFL,O_NONBLOCK);
 unsigned frame=0; char input[128]; size_t used=0;
 do {
  char ch; while(read(0,&ch,1)==1) {
   if(ch=='\n') {input[used]=0;int x,y,p;if(sscanf(input,"%d %d %d",&x,&y,&p)==3) goode_screen_touch(x,y,p);used=0;}
   else if(used<sizeof(input)-1) input[used++]=ch;
  }
  t.now_ms=frame*33;
  for(unsigned i=0;i<2;i++) {t.motors[i].connected=1;t.motors[i].rpm=(float)((frame*3)%200);t.motors[i].voltage=t.motors[i].rpm*0.06f;}
  struct timespec before,after;clock_gettime(CLOCK_MONOTONIC,&before);
  goode_screen_frame(&t);
  clock_gettime(CLOCK_MONOTONIC,&after);
  double ms=(after.tv_sec-before.tv_sec)*1000.0+(after.tv_nsec-before.tv_nsec)/1000000.0;
  if(ms>10) fprintf(stderr,"Frame over budget: %.3f ms\n",ms);
  if(fwrite(pixels,1,sizeof(pixels),stdout)!=sizeof(pixels)) break;fflush(stdout);
  frame++; if(argc>1 && frame>=(unsigned)atoi(argv[1])) break;
  struct timespec delay={0,33000000};nanosleep(&delay,0);
 } while(1);
 goode_screen_shutdown();return 0;
}
