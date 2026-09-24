# More games at ti84calcwiz.com
Ac=Exception
AH='thin'
AG='thick'
AF='tanks'
AE='hit'
A4='ground'
A3='wind'
A2=print
p=False
l='solid'
e='quit'
d='hp'
a='power'
W='p2'
V='angle'
U='alive'
T=str
S=min
R=range
P='top'
O=True
K='p1'
J=int
H='x'
F=None
E='y'
import math as L
try:import ti_draw as B,ti_system as f,time as X;Y=O
except ImportError:
	import sys
	if sys.implementation.name=='tipython':A2('This program needs ti_draw,');A2('which your calculator is');A2('missing. 2-minute fix:');A2('calcplex.com/ti-draw-fix');raise SystemExit
	Y=p
__poll=1
try:f.get_key
except AttributeError:
	def __key(w=0):return f.wait_key()
	f.get_key=__key
	__poll=0
C,D=319,209
M=26
I=5
m=(C+I-1)//I
AI=54
AJ=D-6
Ad=.04
Ae=.2
Af=.095
Ag=.011
AK=6
g=15
q=11
Ah=16
AL=24
Ai=58
Aj=.65
r,s=10,100
A5,A6=2,178
n=3
def N(ri,lo,hi):return lo+(hi-lo)*(ri(0,100000)/1e5)
def b(px):
	A=J(px)//I
	if A<0:return 0
	if A>=m:return m-1
	return A
def A7(top,px):return top[b(px)]
def Ak(ri):
	A=ri;F=N(A,D*.52,D*.66);G,H,K=N(A,12,30),N(A,.006,.012),N(A,0,6.283);M,O,P=N(A,6,15),N(A,.02,.04),N(A,0,6.283);Q,S,T=N(A,2,7),N(A,.05,.09),N(A,0,6.283);E=[]
	for U in R(m):
		C=U*I;B=F+G*L.sin(C*H+K)+M*L.sin(C*O+P)+Q*L.sin(C*S+T)
		if B<AI:B=AI
		elif B>AJ:B=AJ
		E.append(J(B))
	return E
def AM(x,top,face):return{H:J(x),E:A7(top,x),d:100,U:O,V:50 if face>0 else 130,a:55,'face':face}
def Al(top,ri):A=ri(20,80);B=ri(C-80,C-20);return AM(A,top,1),AM(B,top,-1)
def Am(ri):A=Ak(ri);B,C=Al(A,ri);D=ri(-AK,AK);return{P:A,K:B,W:C,A3:D,'turn':0}
def An(tank):A=tank;B=L.radians(A[V]);C=A[H];D=A[E]-q;return C+g*L.cos(B),D-g*L.sin(B)
def AN(tank,angle,power):A=L.radians(angle);B=power*Af;C=tank[H];D=tank[E]-q;F=C+g*L.cos(A);G=D-g*L.sin(A);return{H:F,E:G,'vx':B*L.cos(A),'vy':-B*L.sin(A)}
def AO(pr,wind,scale=1.):B=scale;A=pr;A['vy']+=Ae*B;A['vx']+=wind*Ag*B;A[H]+=A['vx']*B;A[E]+=A['vy']*B
def AP(tank,x,y):A=tank;return A[U]and A[H]-10<=x<=A[H]+10 and A[E]-15<=y<=A[E]+1
def AQ(top,p1,p2,x,y):
	if x<0 or x>=C:return'off',x,y,F
	if y>=D:return A4,x,y,F
	if y>=0:
		if AP(p1,x,y):return AE,x,y,p1
		if AP(p2,x,y):return AE,x,y,p2
		if y>=A7(top,x):return A4,x,y,F
def AR(top,tank,angle,power,wind,p1,p2,dt=1.,maxsteps=1400):
	A=AN(tank,angle,power);C=J(maxsteps/dt)+1
	for D in R(C):
		AO(A,wind,dt);B=AQ(top,p1,p2,A[H],A[E])
		if B is not F:return B
	return'timeout',A[H],A[E],F
def Ao(top,ex,ey,r):
	E=b(ex-r);F=b(ex+r)
	for B in R(E,F+1):
		G=B*I+I//2;A=G-ex
		if A<-r or A>r:continue
		H=L.sqrt(r*r-A*A);C=J(ey+H)
		if C>top[B]:top[B]=S(D,C)
def Ap(ex,ey,tank):
	A=tank
	if not A[U]:return 0
	B=A[H]-ex;C=A[E]-6-ey;D=L.sqrt(B*B+C*C)
	if D>=AL:return 0
	return J(Ai*(1.-D/AL))
def Aq(top,tank):
	A=tank;B=A7(top,A[H])
	if B>A[E]:C=B-A[E];A[E]=B;return C
	return 0
def Ar(g,ex,ey):
	C=g[P];Ao(C,ex,ey,Ah);F={'ex':ex,'ey':ey,AF:[]}
	for A in(g[K],g[W]):
		if not A[U]:continue
		H=A[E];B=Ap(ex,ey,A);I=Aq(C,A);B+=J(I*Aj);A[d]-=B
		if A[E]>=D-3:A[d]=0
		G=p
		if A[d]<=0:A[d]=0;A[U]=p;G=O
		F[AF].append((A,H,B,G))
	return F
def As(g,shooter):
	A,B=g[K][U],g[W][U]
	if A and B:return 0
	if not A and not B:return 1 if shooter==2 else 2
	return 1 if A else 2
At={'E':(11.,.28),'M':(4.,.11),'H':(1.2,.03)}
def Au(g,me,foe,tier,ri):
	O=foe;S=g[P];T=g[A3];U,V=g[K],g[W];Q=O[H];f=O[E]-6;h=me[H]<O[H];X=F;Y=1e9;D=20
	while D<=82:
		A=D if me['face']>0 else 180-D;G,I=r,s
		for i in R(7):
			C=(G+I)/2.;M=AR(S,me,A,C,T,U,V,dt=3.,maxsteps=600);Z=M[1]
			if h:
				if Z<Q:G=C
				else:I=C
			elif Z>Q:G=C
			else:I=C
		B=(G+I)/2.;M=AR(S,me,A,B,T,U,V,dt=3.,maxsteps=600);a=M[1]-Q;b=M[2]-f;c=L.sqrt(a*a+b*b)
		if c<Y:Y=c;X=A,B
		D+=8
	A,B=X;d,e=At[tier];A+=N(ri,-d,d);B*=1.+N(ri,-e,e)
	if A<A5:A=A5
	elif A>A6:A=A6
	if B<r:B=r
	elif B>s:B=s
	return J(round(A)),J(round(B))
h=116,176,224
A8=150,104,58
A9=96,168,74
t=6
u=22,30,44
i=86,150,235
j=232,96,84
AA=40,46,58
Av=34,38,48
AS=250,240,120
Aw=70,90,120
AT=255,240,150
Ax=250,150,40
Ay=220,70,40
c=235,240,250
Q=4
Az=5
def A(c):B.set_color(c[0],c[1],c[2])
def o():
	while __poll and f.get_key(0)!=0:pass
	while O:
		A=f.get_key(0)
		if A!=0:
			while __poll and f.get_key(0)!=0:pass
			return A
def G(y,txt):B.draw_text((C-(len(txt)*10-2))//2,y,txt)
def A_(top):
	A(h);B.fill_rect(-1,-1,C+2,D+2);A(A9)
	for E in R(m):
		F=top[E];G=S(I+1,C-E*I);H=t+1
		if H>D-F:H=D-F
		if G>=2 and H>=2:B.fill_rect(E*I,F,G,H)
	A(A8)
	for E in R(m):
		F=top[E]+t;G=S(I+1,C-E*I)
		if G>=2 and D-F>=2:B.fill_rect(E*I,F,G,D-F)
def v(top,x0,y0,x1,y1):
	L=x1;H=y1;F=y0;E=x0
	if E<0:E=0
	if F<M:F=M
	if L>C:L=C
	if H>D:H=D
	if L-E<2 or H-F<2:return
	T=b(E);U=b(L-1);A(h);B.fill_rect(E,F,L-E,H-F);A(A9)
	for G in R(T,U+1):
		K=top[G];P=K if K>F else F;O=K+t+1
		if O>H:O=H
		J=G*I if G*I>E else E;N=S((G+1)*I+1,C)
		if N-J>=2 and O-P>=2:B.fill_rect(J,P,N-J,O-P)
	A(A8)
	for G in R(T,U+1):
		K=top[G]+t;Q=K if K>F else F;J=G*I if G*I>E else E;N=S((G+1)*I+1,C)
		if N-J>=2 and H-Q>=2:B.fill_rect(J,Q,N-J,H-Q)
def w(top,x0,y0,x1,y1):
	I=top;H=y1;G=x1;F=y0;E=x0
	if E<0:E=0
	if F<M:F=M
	if G>C:G=C
	if H>D:H=D
	if G-E<2 or H-F<2:return
	L=b(E);N=b(G-1);J=D
	for K in R(L,N+1):
		if I[K]<J:J=I[K]
	if H<=J:A(h);B.fill_rect(E,F,G-E,H-F)
	else:v(I,E,F,G,H)
def B0(tank):C=tank;D,F=An(C);G=C[H];I=C[E]-q;A(AA);B.set_pen(AG,l);B.draw_line(G,I,J(D),J(F));B.set_pen(AH,l)
def Z(g,tank):
	C=tank
	if not C[U]:return
	D=C[H];F=C[E];G=i if C is g[K]else j;A(Av);B.fill_rect(D-10,F-3,20,3);A(G);B.fill_rect(D-9,F-8,18,6);B.fill_rect(D-5,F-13,10,6);A((G[0]*60//100,G[1]*60//100,G[2]*60//100));B.fill_rect(D-9,F-8,18,2);B0(C)
def x(top,tank):A=tank[H];B=tank[E];C=g+4;v(top,A-C,B-q-g-4,A+C,B+1)
def B1(g,tank,oy,ny):
	B=tank;C=g[P];A=oy
	while A<ny:
		B[E]=A;x(C,B);A+=4
		if A>ny:A=ny
		B[E]=A;Z(g,B)
		if Y:X.sleep(.03)
	B[E]=ny
AU=4
B2=12
B3,B4=34,44
AV,B5=86,104
AB,B6=196,50
AW=250
B7=258
B8,B9=280,38
k=M//2+11
def AC(x,w):A(u);B.fill_rect(x,-1,w,M+1)
def BA(hp):
	if hp>60:return 110,220,120
	if hp>30:return 240,220,90
	return 240,110,90
def BB(g):A(u);B.fill_rect(-1,-1,C+2,M+1);A(i);B.draw_text(B2,k,'P1');A(j);B.draw_text(B7,k,'P2');BC(g)
def BC(g):
	C=g[A3];AC(AB,B6);A((150,170,200))
	if C==0:B.draw_text(AB,k,'W --');return
	D=(abs(C)+1)//2
	if D>3:D=3
	E=('<'if C<0 else'>')*D;B.draw_text(AB,k,'W'+E+T(abs(C)))
def AX(g,tank):
	C=tank
	if C is g[K]:D,E=B3,B4
	else:D,E=B8,B9
	AC(D,E);A(BA(C[d])if C[U]else(120,120,130));B.draw_text(D,k,T(C[d])if C[U]else'X')
def AY(g,text,col):AC(AV,B5);A(col);B.draw_text(AV,k,text)
def y(g,tank):AY(g,'A'+T(tank[V])+' P'+T(tank[a]),c)
def AD(g,active):
	C=active is g[K];A(i if C else u);B.fill_rect(AU,8,6,10)
	if C:A(c);B.fill_rect(AU,12,5,3)
	A(j if not C else u);B.fill_rect(AW,8,5,10)
	if not C:A(c);B.fill_rect(AW,12,4,3)
def AZ(g,active):BB(g);AX(g,g[K]);AX(g,g[W]);AD(g,active)
def BD(g,active):A=active;A_(g[P]);AZ(g,A);Z(g,g[K]);Z(g,g[W]);y(g,A)
def BE(top,ex,ey):
	F=ey;E=ex;E=J(E);F=J(F)
	if E<0:E=0
	elif E>C-1:E=C-1
	if F<M:F=M
	elif F>D-1:F=D-1
	G=S(E,C-1-E,F-M,D-1-F)
	for(H,K)in((6,AT),(12,Ax),(18,Ay),(11,AT)):
		I=H if H<=G else G
		if I>=2:A(K);B.fill_circle(E,F,I)
		if Y:X.sleep(.03)
	v(top,E-20,F-20,E+20,F+20)
def BF(g,tank,angle,power):
	T=g[P];l=g[A3];m,n=g[K],g[W];L=AN(tank,angle,power);U=[];G=F;Z=X.monotonic();a=0
	def b():
		if G is not F:w(T,G[0]-1,G[1]-1,G[0]+Q+1,G[1]+Q+1)
		for(A,B)in U:w(T,A,B,A+4,B+4)
	while O:
		c=X.monotonic();N=(c-Z)/Ad;Z=c
		if N>2.2:N=2.2
		elif N<.4:N=.4
		d=J(N*3)+1;o=N/d;I=F
		for p in R(d):
			AO(L,l,o);I=AQ(T,m,n,L[H],L[E])
			if I is not F:break
		a+=1
		if I is F and a>1600:I=A4,L[H],D-1,F
		Y,h=J(L[H]),J(L[E]);i=I is F and 0<=Y<C;V=Y
		if V>C-Q:V=C-Q
		S=h
		if S<M:S=M
		elif S>D-Q:S=D-Q
		if G is not F and(i or I is not F):
			w(T,G[0]-1,G[1]-1,G[0]+Q+1,G[1]+Q+1);U.append(G);A(Aw);B.fill_rect(G[0]+1,G[1]+1,2,2)
			if len(U)>Az:j,k=U.pop(0);w(T,j,k,j+4,k+4)
			G=F
		if i:A(AS);B.fill_rect(V,S,Q,Q);G=V,S
		if I is not F:b();return I
		if __poll and f.get_key(0)==45:b();return e,Y,h,F
BG=.28
def BH(g,tank):
	A=tank;I=g[P];y(g,A);C=0;D=0;E=X.monotonic()
	while O:
		B=o();F=X.monotonic()
		if B==45:return e
		if B==105:return'fire'
		if B in(25,34,24,26):
			if B==D and F-E<BG:C+=1
			else:C=0
			D=B;E=F;G=1+2*S(C,6);H=1+2*S(C,7)
			if B==25:A[V]=S(A6,A[V]+G)
			elif B==34:A[V]=max(A5,A[V]-G)
			elif B==26:A[a]=S(s,A[a]+H)
			elif B==24:A[a]=max(r,A[a]-H)
			x(I,A);Z(g,A);y(g,A)
def z(bx,by,bw,bh):A((250,235,150));B.fill_rect(bx,by,bw,bh);A((26,34,52));B.fill_rect(bx+3,by+3,bw-6,bh-6)
def BI(text,sub):E,F=250,70;H=(C-E)//2;B=(D-F)//2;z(H,B,E,F);A((255,220,120));G(B+30,text);A(c);G(B+54,sub)
def BJ(winner,s1,s2):
	E=winner;F,H=250,120;I=(C-F)//2;B=(D-H)//2;z(I,B,F,H);A(i if E==1 else j);G(B+32,('P1'if E==1 else'P2')+' WINS THE ROUND');A(c);G(B+62,'P1  '+T(s1)+'     P2  '+T(s2));A((160,175,200));G(B+92,'ENTER continue')
	while o()not in(105,45):pass
def BK(mwin,is1p):
	E=mwin;B.clear();A(h);B.fill_rect(-1,-1,C+2,D+2);F=is1p and E==1
	if is1p:z(50,40,219,130);A((255,220,120)if F else(240,130,110));G(78,'YOU WIN!'if F else'YOU LOSE');A(c);G(108,('P1'if E==1 else'CPU')+' takes the match');A((160,175,200));G(136,'ENTER  play again');G(156,'CLEAR  menu')
	else:z(50,40,219,130);A(i if E==1 else j);G(84,('PLAYER 1'if E==1 else'PLAYER 2')+' WINS');A(c);G(114,'the match!');A((160,175,200));G(146,'ENTER again   CLEAR menu')
	return o()!=45
def BL(is1p,tier,ri):
	F=G=0
	while F<n and G<n:
		A=Am(ri);B=A[K];BD(A,B);BI('ROUND '+T(F+G+1),'P1  '+T(F)+'   -   P2  '+T(G))
		if Y:X.sleep(.9)
		v(A[P],(C-250)//2,(D-70)//2,(C+250)//2,(D+70)//2);Z(A,A[K]);Z(A,A[W]);J=0
		while J==0:
			Q=1 if B is A[K]else 2;R=not is1p or B is A[K]
			if R:
				AD(A,B);S=BH(A,B)
				if S==e:return e
				L,M=B[V],B[a]
			else:
				AD(A,B);AY(A,'CPU AIMING',(255,210,120));L,M=Au(A,B,A[K],tier,ri);B[V],B[a]=L,M;x(A[P],B);Z(A,B);y(A,B)
				if Y:X.sleep(.5)
			H=BF(A,B,L,M)
			if H[0]==e:return e
			if H[0]in(AE,A4):
				U=Ar(A,H[1],H[2]);BE(A[P],H[1],H[2])
				for(I,N,c,b)in U[AF]:
					O=I[E]
					if b:I[E]=N;x(A[P],I);I[E]=O
					elif O!=N:B1(A,I,N,O)
					else:Z(A,I)
			AZ(A,B);J=As(A,Q)
			if J==0:B=A[W]if B is A[K]else A[K]
		if J==1:F+=1
		else:G+=1
		if F<n and G<n:BJ(J,F,G)
	return 1 if F>=n else 2
def Aa(name):
	if not Y:return 0
	try:return J(list(f.recall_list(name))[0])
	except Ac:return 0
def BM(name,v):
	if Y:
		try:f.store_list(name,[float(v)])
		except Ac:pass
A0=[('1P  EASY',O,'E','TNKE'),('1P  MEDIUM',O,'M','TNKM'),('1P  HARD',O,'H','TNKH'),('2 PLAYERS',p,F,F)]
def BN():
	A(h);B.fill_rect(-1,-1,C+2,D+2);A(A8);B.fill_rect(-1,150,C+2,D-150+1);A(A9);B.fill_rect(-1,150,C+2,6);A(i);B.fill_rect(40,142,18,6);B.fill_rect(45,137,8,6);A(AA);B.set_pen(AG,l);B.draw_line(49,137,62,126);B.set_pen(AH,l);A(j);B.fill_rect(262,142,18,6);B.fill_rect(267,137,8,6);A(AA);B.set_pen(AG,l);B.draw_line(271,137,258,126);B.set_pen(AH,l);A(AS);E=70
	while E<=250:F=J(92+.0053*(E-160)*(E-160));B.fill_rect(E,F,3,3);E+=22
def Ab():BN();A((28,40,60));G(40,'TANKS');A((250,245,250));G(70,'artillery duel');A((150,168,196));G(180,'<- ->  mode     up/dn  help');A((170,185,210));G(200,'ENTER play      CLEAR quit')
def A1(sel):
	C,D,F,E=A0[sel];A(h);B.fill_rect(60,92,199,44);A((255,230,120));G(112,'< '+C+' >')
	if D:A((255,255,255));G(132,'match wins  '+T(Aa(E)))
	else:A((200,210,225));G(132,'pass and play')
def BO():
	B.clear();A((18,24,36));B.fill_rect(-1,-1,C+2,D+2);A((255,220,120));G(24,'HOW TO PLAY');A((225,232,244));H=['Lob a shell across the hills','to blow up the enemy tank.','','up / down  = aim the barrel','left/right = shell power','ENTER      = fire!','','Mind the WIND (top bar) - it','curves the shell. Direct hits','hurt most; blasts carve craters','and can drop a tank into a pit.','','First to 3 rounds wins a match.','Press any key to go back.'];E=44
	for F in H:
		if F:B.draw_text(6,E,F)
		E+=12
	o()
def BP():
	A=0;Ab();A1(A)
	while O:
		B=o()
		if B==45:return
		if B==105:return A0[A]
		if B==24:A=(A-1)%len(A0);A1(A)
		elif B==26:A=(A+1)%len(A0);A1(A)
		elif B in(25,34):BO();Ab();A1(A)
def BQ():
	import random as H;I=H.randint
	while O:
		E=BP()
		if E is F:break
		K,A,J,G=E;C=O
		while C:
			D=BL(A,J,I)
			if D==e:C=p
			else:
				if A and D==1:BM(G,Aa(G)+1)
				C=BK(D,A)
	B.clear()
if Y:BQ()