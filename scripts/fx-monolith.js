import { glCanvas, animate, theme, reduced } from "./common.js";

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uScroll;
uniform float uLight;
const float WZ=-2.6;
const float WT=.24;
float box(vec3 p,vec3 c,vec3 b){vec3 q=abs(p-c)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float crossD(vec2 q){
  vec2 a=abs(q-vec2(-.55,1.55));
  float v=max(a.x-.07,a.y-1.25);
  vec2 b=abs(q-vec2(1.15,2.35));
  float h=max(b.x-1.05,b.y-.07);
  return min(v,h);
}
float solids(vec3 p){
  float d=p.y;
  d=min(d,box(p,vec3(-3.05,1.65,-.2),vec3(.15,1.65,2.6)));
  d=min(d,box(p,vec3(.4,3.43,-.4),vec3(3.6,.13,2.4)));
  d=min(d,box(p,vec3(-.7,.22,-1.1),vec3(1.1,.22,.3)));
  d=min(d,box(p,vec3(2.9,1.65,1.6),vec3(.14,1.65,.14)));
  d=min(d,box(p,vec3(5.4,1.1,2.6),vec3(1.1,1.1,1.1)));
  d=min(d,box(p,vec3(-6.2,2.2,-1.),vec3(1.4,2.2,1.6)));
  return d;
}
float wall(vec3 p){
  float w=box(p,vec3(0.,1.65,WZ-WT*.5),vec3(4.,1.65,WT*.5));
  return max(w,-max(crossD(p.xy),abs(p.z-(WZ-WT*.5))-.4));
}
float map(vec3 p){return min(solids(p),wall(p));}
float gate(vec3 p,vec3 L){
  if(p.z<WZ-WT)return 1.;
  float t0=(WZ-p.z)/L.z;
  float t1=(WZ-WT-p.z)/L.z;
  vec2 q0=p.xy+L.xy*t0;
  vec2 q1=p.xy+L.xy*t1;
  bool inWall=abs(q0.x)<4.&&q0.y<3.3;
  if(!inWall){
    bool roof=p.x>-3.2&&p.x<4.&&p.z<2.&&p.y<3.3;
    return roof?0.:1.;
  }
  float c=max(crossD(q0),crossD(q1));
  float soft=.004+.01*t0;
  return 1.-smoothstep(-soft,soft,c);
}
float shadow(vec3 ro,vec3 rd,float tmax){
  float r=1.,t=.03;
  for(int i=0;i<22;i++){
    float h=solids(ro+rd*t);
    r=min(r,10.*h/t);
    t+=clamp(h,.03,.4);
    if(r<.01||t>tmax)break;
  }
  return clamp(r,0.,1.);
}
vec3 normal(vec3 p){vec2 e=vec2(.0015,-.0015);return normalize(e.xyy*map(p+e.xyy)+e.yyx*map(p+e.yyx)+e.yxy*map(p+e.yxy)+e.xxx*map(p+e.xxx));}
float ao(vec3 p,vec3 n){float o=0.,s=1.;for(int i=1;i<=5;i++){float h=.05*float(i);o+=(h-map(p+n*h))*s;s*=.7;}return clamp(1.-2.2*o,0.,1.);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float t=uTime;
  vec3 ro=vec3(-1.4+.9*sin(t*.07)+uMouse.x*.6,1.25+uScroll*.5+uMouse.y*.25,7.4-uScroll*2.6);
  vec3 ta=vec3(-1.9+uScroll*1.2,1.55,WZ);
  vec3 ww=normalize(ta-ro),uu=normalize(cross(ww,vec3(0,1,0))),vv=cross(uu,ww);
  vec3 rd=normalize(uv.x*uu+uv.y*vv+1.65*ww);
  vec3 L=normalize(vec3(-.22+uMouse.x*.35,.42+uMouse.y*.16,-1.));
  vec3 sun=mix(vec3(1.,.74,.46)*3.6,vec3(1.,.86,.66)*2.4,uLight);
  vec3 sky=mix(vec3(.035,.04,.055),vec3(.82,.81,.78),uLight);
  vec3 fogC=mix(vec3(.012,.013,.018),vec3(.93,.92,.89),uLight);
  float dens=mix(.075,.035,uLight);
  float tt=0.,hit=-1.;
  for(int i=0;i<90;i++){
    float h=map(ro+rd*tt);
    if(h<.0012*tt){hit=tt;break;}
    tt+=h;
    if(tt>40.)break;
  }
  float far=hit>0.?hit:40.;
  vec3 col;
  if(hit>0.){
    vec3 p=ro+rd*hit;
    vec3 n=normal(p);
    float alb=.42+.08*noise(p.xz*3.+p.y*2.)+.05*noise(p.xy*14.);
    vec2 fw=abs(n.z)>.9?p.xy:abs(n.x)>.9?p.zy:p.xz;
    vec2 cell=fract(fw/vec2(.9,.45))-.5;
    float tie=1.-smoothstep(.0,.03,length(cell*vec2(.9,.45))-.018);
    vec2 seam=abs(fract(fw/vec2(1.8,.9))-.5);
    float joint=1.-smoothstep(.494,.499,max(seam.x,seam.y));
    if(n.y<.9)alb*=1.-.45*tie-.25*(1.-joint);
    else alb=mix(alb,.36+.1*noise(p.xz*.7),.5);
    float tmax=p.z>WZ?(WZ-p.z)/L.z:12.;
    float vis=gate(p+n*.002,L)*shadow(p+n*.004,L,max(.1,tmax));
    float dif=max(dot(n,L),0.)*vis;
    float occ=ao(p,n);
    float open=smoothstep(-2.8,1.8,p.z)*.7+.3;
    vec3 amb=sky*(.55+.45*n.y)*occ*open+sky*.25*occ*max(0.,-n.z);
    vec3 bounce=sun*.06*occ*smoothstep(-2.6,-.5,p.z)*(1.-n.y)*(1.-uLight*.5);
    col=vec3(alb)*(sun*dif+amb*mix(1.6,1.15,uLight)+bounce);
    col+=sun*.25*pow(max(dot(reflect(rd,n),L),0.),24.)*vis*(n.y>.9?1.:.2);
  }else{
    float mu0=max(dot(rd,L),0.);
    col=mix(sky,sky*1.5+vec3(.02),smoothstep(-.1,.6,rd.y))+sun*(.18*pow(mu0,5.)+1.2*pow(mu0,90.));
  }
  float tr=exp(-dens*far);
  float g=.72,mu=dot(rd,L);
  float phase=(1.-g*g)/pow(1.+g*g-2.*g*mu,1.5)*.08;
  vec3 scat=vec3(0.);
  float step_=min(far,22.)/36.;
  float jitter=hash(gl_FragCoord.xy+fract(t)*31.);
  for(int i=0;i<36;i++){
    float s=(float(i)+jitter)*step_;
    vec3 q=ro+rd*s;
    float room=step(-3.,q.x)*step(q.x,4.)*step(q.z,2.)*step(q.y,3.3)*step(WZ,q.z);
    float v=gate(q,L)*mix(.04,1.,room);
    float dust=.75+.5*noise(q.xy*1.6+vec2(t*.15,-t*.05));
    scat+=sun*v*phase*dust*exp(-dens*s)*dens*step_;
  }
  col=col*tr+fogC*(1.-tr)+scat*mix(1.,.35,uLight);
  col=aces(col*mix(1.1,1.,uLight));
  col=pow(col,vec3(1./2.2));
  float vig=smoothstep(1.25,.25,length(uv*vec2(.85,1.)));
  col*=mix(.55,1.,vig);
  col+=(hash(gl_FragCoord.xy+t)-.5)/255.*2.;
  gl_FragColor=vec4(col,1.);
}`;

export function monolith(canvas) {
  const layer = glCanvas(canvas, FRAGMENT, { scale: 0.6, uniforms: ["uMouse", "uScroll", "uLight"] });
  if (!layer) {
    canvas.closest("[data-gl-host]")?.setAttribute("data-gl-off", "");
    return null;
  }
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  let scroll = 0;
  let light = theme() === "light" ? 1 : 0;
  let lightTarget = light;
  addEventListener("pointermove", (e) => {
    mouse.tx = (e.clientX / innerWidth) * 2 - 1;
    mouse.ty = 1 - (e.clientY / innerHeight) * 2;
  });
  addEventListener("themechange", (e) => (lightTarget = e.detail === "light" ? 1 : 0));
  canvas.closest("[data-gl-host]")?.setAttribute("data-gl", "");
  animate(canvas, layer, (gl, u) => {
    const k = reduced.matches ? 1 : 0.06;
    mouse.x += (mouse.tx - mouse.x) * k;
    mouse.y += (mouse.ty - mouse.y) * k;
    light += (lightTarget - light) * (reduced.matches ? 1 : 0.08);
    scroll = Math.min(1, scrollY / innerHeight);
    gl.uniform2f(u.uMouse, mouse.x, mouse.y);
    gl.uniform1f(u.uScroll, scroll);
    gl.uniform1f(u.uLight, light);
  });
  return layer;
}
