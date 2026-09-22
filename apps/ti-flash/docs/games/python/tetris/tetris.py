# More games at ti84calcwiz.com
AB='TETRIS'
AA=Exception
z='S'
y='T'
x='O'
w='I'
v=range
u=enumerate
l='alive'
k=min
j=print
Z='y'
Y='rot'
V='x'
U=False
T=str
P='t'
O=len
M='lines'
L='score'
K='board'
J='nt'
H='level'
G=True
import random as m
try:import ti_draw as B,ti_system as Q,time;a=G
except ImportError:
	import sys
	if sys.implementation.name=='tipython':j('This program needs ti_draw,');j('which your calculator is');j('missing. 2-minute fix:');j('calcplex.com/ti-draw-fix');raise SystemExit
	a=U
D,E=10,20
b='IOTSZJL'
c={w:[[(0,1),(1,1),(2,1),(3,1)],[(2,0),(2,1),(2,2),(2,3)]],x:[[(1,0),(2,0),(1,1),(2,1)]],y:[[(1,0),(0,1),(1,1),(2,1)],[(1,0),(1,1),(2,1),(1,2)],[(0,1),(1,1),(2,1),(1,2)],[(1,0),(0,1),(1,1),(1,2)]],z:[[(1,0),(2,0),(0,1),(1,1)],[(1,0),(1,1),(2,1),(2,2)]],'Z':[[(0,0),(1,0),(1,1),(2,1)],[(2,0),(1,1),(2,1),(1,2)]],'J':[[(0,0),(0,1),(1,1),(2,1)],[(1,0),(2,0),(1,1),(1,2)],[(0,1),(1,1),(2,1),(2,2)],[(1,0),(1,1),(0,2),(1,2)]],'L':[[(2,0),(0,1),(1,1),(2,1)],[(1,0),(1,1),(1,2),(2,2)],[(0,1),(1,1),(2,1),(0,2)],[(0,0),(1,0),(1,1),(1,2)]]}
n={w:(0,200,200),x:(220,200,0),y:(180,0,200),z:(0,200,0),'Z':(220,0,0),'J':(0,0,220),'L':(240,140,0)}
A0={B:A+1 for(A,B)in u(b)}
AC={A+1:n[B]for(A,B)in u(b)}
AD=[0,100,300,500,800]
def A1():return[[0]*D for A in v(E)]
def A2(randint):return b[randint(0,O(b)-1)]
def o(t,rot,x,y):A=c[t][rot%O(c[t])];return[(x+A,y+B)for(A,B)in A]
def p(st):return o(st[P],st[Y],st[V],st[Z])
def q(board,cells):
	for(A,B)in cells:
		if A<0 or A>=D or B<0 or B>=E:return U
		if board[B][A]:return U
	return G
def A3(st,randint):
	A=st;A[P]=A[J];A[J]=A2(randint);A[Y]=0;A[V]=3;A[Z]=0
	if not q(A[K],p(A)):A[l]=U
def AE(randint):A=randint;B={K:A1(),L:0,M:0,H:1,l:G,J:A2(A)};A3(B,A);return B
def d(st,dx,dy):
	A=st;B=o(A[P],A[Y],A[V]+dx,A[Z]+dy)
	if q(A[K],B):A[V]+=dx;A[Z]+=dy;return G
	return U
def AF(st):
	A=st;B=(A[Y]+1)%O(c[A[P]])
	for C in(0,-1,1,-2,2):
		D=o(A[P],B,A[V]+C,A[Z])
		if q(A[K],D):A[Y]=B;A[V]+=C;return G
	return U
def AG(board):
	A=[A for A in board if not all(A)];B=E-O(A)
	while O(A)<E:A.insert(0,[0]*D)
	return A,B
def A4(st,randint):
	A=st;C=A0[A[P]]
	for(D,E)in p(A):A[K][E][D]=C
	A[K],B=AG(A[K])
	if B:A[M]+=B;A[L]+=AD[B]*A[H];A[H]=A[M]//10+1
	A3(A,randint);return B
def AH(st,randint):
	if not d(st,0,1):A4(st,randint)
def AI(st,randint):
	while d(st,0,1):pass
	A4(st,randint)
A=10
W,e=6,5
I=W+D*A+18
r=I+108
f=16,16,22
A5=30,30,40
A6=90,160,235
g=226,229,236
h=122,128,142
i=235,200,70
F,N=319,209
def C(col):A=col;B.set_color(A[0],A[1],A[2])
def A7():
	while Q.get_key(0)!=0:pass
	while G:
		A=Q.get_key(0)
		if A!=0:
			while Q.get_key(0)!=0:pass
			return A
def A8(x,y,col):C(col);B.fill_rect(x,y,A-1,A-1)
def AJ(st):
	A=[A[:]for A in st[K]]
	if st[l]:
		F=A0[st[P]]
		for(B,C)in p(st):
			if 0<=C<E and 0<=B<D:A[C][B]=F
	return A
def R(st,screen):
	L=AJ(st);I={}
	for H in v(E):
		J,K=screen[H],L[H]
		for F in v(D):
			if K[F]!=J[F]:
				G=K[F]
				if G not in I:I[G]=[]
				I[G].append((F,H));J[F]=G
	for(G,M)in I.items():
		if G==0:C(A5)
		else:C(AC[G])
		for(F,H)in M:B.fill_rect(W+F*A,e+H*A,A-1,A-1)
def AK(nt):
	C(f);B.fill_rect(r,72,4*A,4*A);D=c[nt][0];E=[A for(A,B)in D];F=[A for(B,A)in D];G=r+(4*A-(max(E)-k(E)+1)*A)//2-k(E)*A;H=72+(4*A-(max(F)-k(F)+1)*A)//2-k(F)*A;I=n[nt]
	for(J,K)in D:A8(G+J*A,H+K*A,I)
def s(x,y,txt):C(f);B.fill_rect(x,y-18,100,22);C(g);B.draw_text(x,y,txt)
def t(st,cache):
	B=cache;A=st
	if B.get(L)!=A[L]:s(I,80,T(A[L]));B[L]=A[L]
	if B.get(M)!=A[M]:s(I,136,T(A[M]));B[M]=A[M]
	if B.get(H)!=A[H]:s(I,192,T(A[H]));B[H]=A[H]
	if B.get(J)!=A[J]:AK(A[J]);B[J]=A[J]
def AL():global F,N;G=B.get_screen_dim();F,N=G[0],G[1];C(f);B.fill_rect(-1,-1,F+2,N+2);C(A5);B.fill_rect(W,e,D*A,E*A);C(A6);B.draw_rect(W-3,e-3,D*A+5,E*A+5);B.draw_rect(W-2,e-2,D*A+3,E*A+3);C(i);B.draw_text(I,30,AB);C(h);B.draw_text(I,62,'SCORE');B.draw_text(I,118,'LINES');B.draw_text(I,174,'LEVEL');B.draw_text(r,62,'NEXT')
def AM(level):A=.6-(level-1)*.04;return A if A>.25 else .25
def AN():
	A=AE(m.randint);C=A1();F={};AL();R(A,C);t(A,F);D=time.monotonic();E=D
	while A[l]:
		D=time.monotonic();B=Q.get_key(0)
		if B==45:A['quit']=G;break
		if B==25:
			if AF(A):R(A,C)
		elif B==105:AI(A,m.randint);R(A,C);t(A,F);E=D
		elif B==24 or B==26:
			if d(A,-1 if B==24 else 1,0):R(A,C)
		elif B==34:
			if d(A,0,1):R(A,C)
			E=D
		if D-E>=AM(A[H]):E=D;AH(A,m.randint);R(A,C);t(A,F)
	return A
AO=10
def X(cx,y,txt,col):C(col);B.draw_text(cx-(O(txt)*AO-2)//2,y,txt)
def S(y,txt,col):X(F//2,y,txt,col)
A9='HITET'
def AP():
	if not a:return 0
	try:return int(list(Q.recall_list(A9))[0])
	except AA:return 0
def AQ(v):
	if a:
		try:Q.store_list(A9,[float(v)])
		except AA:pass
def AR(hi):
	global F,N;D=B.get_screen_dim();F,N=D[0],D[1];C(f);B.fill_rect(-1,-1,F+2,N+2);E='J','L',y,w,x,z,'Z';G=(F-((O(E)-1)*(A+2)+(A-1)))//2
	for(H,I)in u(E):A8(G+H*(A+2),40,n[I])
	S(72,AB,i)
	if hi:S(94,'BEST  '+T(hi),i)
	S(110,'<- ->  move      ^  rotate',g);S(134,'v  soft drop   ENTER  drop',g);S(158,'CLEAR  quit',h);S(190,'press any key',h);return A7()!=45
def AS(score,hi):D,E=150,110;G=(F-D)//2;A=(N-E)//2;C((0,0,0));B.fill_rect(G,A,D,E);C(A6);B.draw_rect(G,A,D,E);B.draw_rect(G+1,A+1,D-2,E-2);H=G+D//2;X(H,A+24,'GAME OVER',(235,80,80));X(H,A+48,'Score '+T(score),g);X(H,A+70,'Best  '+T(hi),i);X(H,A+92,'ENTER  again',h);return A7()!=45
def AT():
	A=AP()
	while G:
		if not AR(A):break
		E=G
		while E:
			D=AN()
			if D.get('quit'):break
			C=D[L]
			if C>A:A=C;AQ(A)
			if not AS(C,A):break
	B.clear()
if a:AT()