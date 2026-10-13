import { glCanvas, animate, theme, reduced } from "./common.js";

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uLight;
uniform float uScroll;
uniform vec3 uRip[4];
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*noise(p);p=m*p;a*=.5;}return v;}
float line(float d,float w){return 1.-smoothstep(w*.5,w*.5+1.,d);}
void main(){
  vec2 px=gl_FragCoord.xy;
  float s=max(.6,uRes.y/950.);
  vec2 m=uMouse;
  vec2 d=px-m;
  float r=length(d);
  float lens=exp(-r*r/(2.*pow(210.*s,2.)));
  vec2 g=px-d*lens*.32;
  float t=uTime;
  for(int i=0;i<4;i++){
    vec3 R=uRip[i];
    float age=t-R.z;
    if(age<0.||age>2.4)continue;
    vec2 dd=px-R.xy;
    float rr=length(dd);
    float front=age*520.*s;
    float w=exp(-abs(rr-front)*.018/s)*(1.-age/2.4);
    g+=dd/(rr+1e-3)*sin((rr-front)*.06/s)*w*14.*s;
  }
  vec2 uv=px/uRes.y;
  vec2 q=vec2(fbm(uv*1.3+vec2(t*.03,0.)),fbm(uv*1.3+vec2(5.2,1.3)-vec2(0.,t*.025)));
  float f=fbm(uv*1.7+q*1.8+vec2(uScroll*.4,0.));
  vec3 paper=mix(vec3(.035,.09,.19),vec3(.957,.951,.93),uLight);
  vec3 c1=mix(vec3(.04,.27,.42),vec3(.72,.87,.93),uLight);
  vec3 c2=mix(vec3(.17,.1,.34),vec3(.99,.84,.71),uLight);
  vec3 ink=mix(vec3(.72,.86,1.),vec3(.13,.38,.58),uLight);
  vec3 accent=mix(vec3(1.,.62,.32),vec3(.86,.33,.14),uLight);
  vec3 col=mix(paper,c1,smoothstep(.38,.86,f)*.6);
  col=mix(col,c2,smoothstep(.5,.92,q.x)*.38);
  col+=(lens*.06)*mix(vec3(.2,.5,.8),vec3(1.),uLight)*(1.-uLight*.6);
  float minor=22.*s,major=110.*s;
  vec2 a=abs(fract(g/minor+.5)-.5)*minor;
  vec2 b=abs(fract(g/major+.5)-.5)*major;
  float lm=max(line(a.x,.6),line(a.y,.6));
  float lM=max(line(b.x,1.),line(b.y,1.));
  col=mix(col,ink,lm*(.08+.14*lens)+lM*(.2+.22*lens));
  float dash=step(.45,fract((px.x+px.y)/(10.*s)));
  float ch=(line(abs(px.x-m.x),.8)+line(abs(px.y-m.y),.8))*dash*(.15+.35*lens);
  float circ=line(abs(r-120.*s),1.)*.7+line(abs(r-34.*s),.8)*.5;
  float ticks=0.;
  float ang=atan(d.y,d.x);
  float tk=abs(fract(ang/6.2831853*36.)-.5);
  ticks=line(tk*r*6.2831853/36.,1.)*step(abs(r-128.*s),8.*s);
  col=mix(col,accent,clamp(ch+circ+ticks*.7,0.,1.)*smoothstep(0.,1.,uMouse.x+uMouse.y));
  col+=(hash(px+fract(t)*17.)-.5)/255.*3.;
  gl_FragColor=vec4(col,1.);
}`;

export function blueprint(canvas) {
  const layer = glCanvas(canvas, FRAGMENT, { scale: 1, uniforms: ["uMouse", "uLight", "uScroll", "uRip"] });
  if (!layer) {
    canvas.closest("[data-gl-host]")?.setAttribute("data-gl-off", "");
    return null;
  }
  const mouse = { x: -999, y: -999, tx: -999, ty: -999 };
  const rip = new Float32Array(12).fill(-99);
  let ripIndex = 0;
  const t0 = performance.now() / 1000;
  let clock = 0;
  let light = theme() === "light" ? 1 : 0;
  let lightTarget = light;
  const toCanvas = (e) => {
    const box = canvas.getBoundingClientRect();
    const k = canvas.width / Math.max(1, box.width);
    return [(e.clientX - box.left) * k, (box.bottom - e.clientY) * k];
  };
  const host = canvas.closest("[data-gl-host]") ?? canvas;
  host.addEventListener("pointermove", (e) => {
    [mouse.tx, mouse.ty] = toCanvas(e);
    if (mouse.x < -900) [mouse.x, mouse.y] = [mouse.tx, mouse.ty];
  });
  host.addEventListener("pointerleave", () => {
    mouse.tx = mouse.ty = -999;
  });
  host.addEventListener("pointerdown", (e) => {
    const [x, y] = toCanvas(e);
    rip.set([x, y, clock], 3 * (ripIndex++ % 4));
  });
  addEventListener("themechange", (e) => (lightTarget = e.detail === "light" ? 1 : 0));
  host.setAttribute("data-gl", "");
  animate(canvas, layer, (gl, u) => {
    const now = reduced.matches ? 4 : performance.now() / 1000 - t0;
    clock = now;
    const k = reduced.matches ? 1 : 0.14;
    if (mouse.tx < -900) {
      mouse.x += (-999 - mouse.x) * 0.02;
      mouse.y += (-999 - mouse.y) * 0.02;
    } else {
      mouse.x += (mouse.tx - mouse.x) * k;
      mouse.y += (mouse.ty - mouse.y) * k;
    }
    light += (lightTarget - light) * (reduced.matches ? 1 : 0.08);
    gl.uniform2f(u.uMouse, mouse.x, mouse.y);
    gl.uniform1f(u.uLight, light);
    gl.uniform1f(u.uScroll, Math.min(1, scrollY / innerHeight));
    gl.uniform3fv(u.uRip, rip);
    gl.uniform1f(u.uTime, now);
  });
  return layer;
}
