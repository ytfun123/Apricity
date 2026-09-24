# More games at ti84calcwiz.com
AD='SUDOKU'
AC='EXPERT'
AB='MEDIUM'
s='sol'
r=Exception
q=list
j=int
i=len
h=print
a='hints'
Z='hint'
Y='given'
X=set
S='notesmode'
O='conf'
N=None
M=str
L=False
J='cur'
I=divmod
H='notes'
G=True
D='grid'
A=range
import random as t
try:import ti_draw as C,ti_system as k,time as l;u=G
except ImportError:
	import sys
	if sys.implementation.name=='tipython':h('This program needs ti_draw,');h('which your calculator is');h('missing. 2-minute fix:');h('calcplex.com/ti-draw-fix');raise SystemExit
	u=L
__poll=1
try:k.get_key
except AttributeError:
	def __key(w=0):return k.wait_key()
	k.get_key=__key
	__poll=0
def AE(i):
	C,D=I(i,9);F,G=C//3*3,D//3*3;B=[]
	for E in A(9):B.append(C*9+E);B.append(E*9+D)
	for H in A(3):
		for J in A(3):B.append((F+H)*9+(G+J))
	return[A for A in X(B)if A!=i]
b=[AE(A)for A in A(81)]
def Q(lst,ri):
	B=lst
	for C in A(i(B)-1,0,-1):D=ri(0,C);B[C],B[D]=B[D],B[C]
def AF():
	C=[0]*81
	for B in A(9):
		for D in A(9):C[B*9+D]=(3*(B%3)+B//3+D)%9+1
	return C
def AG(ri):
	B=ri;J=q(A(1,10));Q(J,B);N=[J[A-1]for A in AF()];C=[N[A*9:A*9+9]for A in A(9)]
	for D in A(3):
		E=[0,1,2];Q(E,B);I=[C[D*3+E[A]]for A in A(3)]
		for F in A(3):C[D*3+F]=I[F]
	G=[0,1,2];Q(G,B);C=[C[G[B]*3+D]for B in A(3)for D in A(3)];H=[[C[A][B]for A in A(9)]for B in A(9)]
	for D in A(3):
		E=[0,1,2];Q(E,B);I=[H[D*3+E[A]]for A in A(3)]
		for F in A(3):H[D*3+F]=I[F]
	G=[0,1,2];Q(G,B);H=[H[G[B]*3+C]for B in A(3)for C in A(3)];K=[0]*81
	for L in A(9):
		for M in A(9):K[M*9+L]=H[L][M]
	return K
def AH(board,limit=2,node_cap=2600):
	G=board[:];H=[0]*9;J=[0]*9;K=[0]*9
	for R in A(81):
		F=G[R]
		if F:C,D=I(R,9);B=1<<F;H[C]|=B;J[D]|=B;K[C//3*3+D//3]|=B
	def S():
		D=-1;E=N;F=10
		for B in A(81):
			if G[B]==0:
				L,M=I(B,9);P=H[L]|J[M]|K[L//3*3+M//3];O=[A for A in A(1,10)if not P>>A&1];C=i(O)
				if C<F:
					D=B;E=O;F=C
					if C<=1:break
		return D,E
	E,L=S()
	if E==-1:return 1
	M=[[E,L,0]];O=0;T=0
	while M:
		T+=1
		if T>node_cap:return-1
		P=M[-1];E=P[0];L=P[1];Q=P[2]
		if Q>=i(L):
			F=G[E]
			if F:C,D=I(E,9);B=1<<F;H[C]&=~B;J[D]&=~B;K[C//3*3+D//3]&=~B;G[E]=0
			M.pop();continue
		F=L[Q];P[2]=Q+1;C,D=I(E,9);U=C//3*3+D//3;V=G[E]
		if V:B=1<<V;H[C]&=~B;J[D]&=~B;K[U]&=~B
		B=1<<F;G[E]=F;H[C]|=B;J[D]|=B;K[U]|=B;W,X=S()
		if W==-1:
			O+=1
			if O>=limit:return O
		elif X:M.append([W,X,0])
	return O
c=[]
for AI in A(9):c.append([AI*9+A for A in A(9)])
for AJ in A(9):c.append([A*9+AJ for A in A(9)])
for AK in A(3):
	for AL in A(3):c.append([(AK*3+B)*9+(AL*3+C)for B in A(3)for C in A(3)])
v=0
for AM in A(1,10):v|=1<<AM
def AN(x):
	A=0
	while x:x&=x-1;A+=1
	return A
def AO(c):
	A=1
	while c>2:c>>=1;A+=1
	return A
def AP(grid):
	C=grid[:]
	while G:
		E=[0]*81
		for B in A(81):
			if C[B]==0:
				H=0
				for N in b[B]:
					I=C[N]
					if I:H|=1<<I
				J=v&~H
				if J==0:return L
				E[B]=J
		D=L
		for B in A(81):
			if C[B]==0 and AN(E[B])==1:C[B]=AO(E[B]);D=G
		if D:continue
		for O in c:
			for K in A(1,10):
				P=1<<K;F=0;M=-1
				for B in O:
					if C[B]==0 and E[B]&P:
						F+=1;M=B
						if F>1:break
				if F==1:C[M]=K;D=G
			if D:break
		if D:continue
		break
	return all(C)
w={'EASY':(46,G),AB:(38,G),'HARD':(31,N),AC:(26,N)}
Ao={A:B[0]for(A,B)in w.items()}
def m(ri,target):
	F=AG(ri);B=F[:];E=81;G=q(A(41));Q(G,ri)
	for C in G:
		if E<=target:break
		D=80-C
		if B[C]==0:continue
		I,J=B[C],B[D];B[C]=0;H=1
		if D!=C and B[D]!=0:B[D]=0;H=2
		if AH(B,2)==1:E-=H
		else:B[C]=I;B[D]=J
	return B,F,E
def AQ(ri,diff,tries=10):
	B=diff
	if isinstance(B,j):return m(ri,B)
	D,E=w[B]
	if E is N:return m(ri,D)
	F=N
	for I in A(tries):
		C,G,H=m(ri,D)
		if AP(C)==E:return C,G,H
		F=C,G,H
	return F
def T(grid):
	C=[L]*81
	for B in A(81):
		D=grid[B]
		if D:
			for E in b[B]:
				if grid[E]==D:C[B]=G;break
	return C
def AR(grid):
	if any(A==0 for A in grid):return L
	return not any(T(grid))
if u:
	U,V,K=6,8,20;x,y=1,18;P=194;E=P+(319-P)//2;z=118,122,130;AS=250,250,250;AT=219,224,232;AU=255,232,130;AV=120,178,252;AW=24,24,30;AX=36,82,214;AY=20,150,92;AZ=214,44,44;Aa=108,114,128;A0=30,32,38
	def F(c):C.set_color(c[0],c[1],c[2])
	def W(x,y,t,c):F(c);C.draw_text(x,y,t)
	def B(cx,y,t,c):F(c);C.draw_text(cx-(i(t)*10-2)//2,y,t)
	A1={92:1,93:2,94:3,82:4,83:5,84:6,72:7,73:8,74:9};n=0
	def Ab(refresh=N):
		B=refresh;global n
		while G:
			A=k.get_key(0)
			if A!=n:
				n=A
				if A!=0:return A
			if B:B()
	def o():return Ab(N)
	def Ac(diff,ri):A,B,C=AQ(ri,diff);return{'diff':diff,D:A[:],Y:[A!=0 for A in A],s:B,Z:[L]*81,H:[0]*81,O:T(A),J:40,S:L,a:0}
	def Ad(st,i):
		if i==st[J]:return AU
		A=st[D][st[J]]
		if A and st[D][i]==A:return AV
		B,C=I(i,9);return AT if(B//3+C//3)%2 else AS
	def d(st,i):
		B=st;Q,R=I(i,9);G,J=U+R*K+x,V+Q*K+x;F(Ad(B,i));C.fill_rect(G,J,y,y);N=B[D][i]
		if N:
			if B[Y][i]:E=AW
			elif B[O][i]:E=AZ
			elif B[Z][i]:E=AY
			else:E=AX
			W(G+4,J+21,M(N),E)
		else:
			P=B[H][i]
			if P:
				F(Aa)
				for L in A(1,10):
					if P>>L&1:S,T=(L-1)//3,(L-1)%3;C.fill_rect(G+T*6+1,J+S*6+1,4,4)
	def Ae(st):
		F(z);C.fill_rect(U,V,9*K,9*K)
		for D in A(81):d(st,D)
		F((70,74,82))
		for B in(3,6):C.fill_rect(U+B*K-1,V,2,9*K);C.fill_rect(U,V+B*K-1,9*K,2)
		F((40,42,50));C.draw_rect(U,V,9*K,9*K)
	def e(st,idxs):
		for A in idxs:d(st,A)
	def A2(sec):A=sec;B=A//60;return(M(B)if B>9 else'0'+M(B))+':'+(M(A%60)if A%60>9 else'0'+M(A%60))
	f=319-P
	def A3(y):F(A0);C.fill_rect(P,y-18,f+1,24)
	def Af(st):F(A0);C.fill_rect(P,-1,f+1,211);B(E,24,AD,(250,205,70));B(E,48,st['diff'],(150,210,250));B(E,146,'1-9 place',(150,154,164));B(E,164,'0/DEL erase',(150,154,164));B(E,182,'2nd notes',(150,154,164));B(E,200,'ENTER hint',(150,154,164))
	def A4(st):
		A3(84)
		if st[S]:B(E,84,'NOTES',(250,180,70))
		else:B(E,84,'PEN',(150,250,160))
	def A5(st):A3(110);B(E,110,'hints '+M(st[a]),(180,184,194))
	def Ag(st):C.clear();Ae(st);Af(st);A4(st);A5(st)
	def R(st,val):return[A for A in A(81)if val and st[D][A]==val]
	def g(st,nc):
		A=st;C=A[J];E=A[D][C];F=A[D][nc];A[J]=nc;B=X([C,nc])
		if E!=F:B.update(R(A,E));B.update(R(A,F))
		e(A,B)
	def Ah(st,v):
		B=st;C=B[J]
		if B[Y][C]:return
		if B[S]:
			if B[D][C]==0:B[H][C]^=1<<v;d(B,C)
			return
		if B[D][C]==v:return A6(B)
		K=B[D][C];B[D][C]=v;B[H][C]=0;B[Z][C]=L;E=X([C]);E.update(R(B,K));E.update(R(B,v))
		for F in b[C]:
			if B[H][F]&1<<v:B[H][F]&=~(1<<v);E.add(F)
		I=T(B[D])
		for G in A(81):
			if I[G]!=B[O][G]:E.add(G)
		B[O]=I;e(B,E)
	def A6(st):
		B=st;C=B[J]
		if B[Y][C]:return
		if B[S]and B[D][C]==0:
			if B[H][C]:B[H][C]=0;d(B,C)
			return
		G=B[D][C]
		if G==0 and B[H][C]==0:return
		B[D][C]=0;B[H][C]=0;B[Z][C]=L;E=X([C]);E.update(R(B,G));I=T(B[D])
		for F in A(81):
			if I[F]!=B[O][F]:E.add(F)
		B[O]=I;e(B,E)
	def Ai(st):
		B=st;C=B[J]
		if B[Y][C]or B[D][C]==B[s][C]:return
		E=B[s][C];B[D][C]=E;B[H][C]=0;B[Z][C]=G;B[a]+=1;F=X([C]);F.update(R(B,E))
		for I in b[C]:
			if B[H][I]&1<<E:B[H][I]&=~(1<<E);F.add(I)
		L=T(B[D])
		for K in A(81):
			if L[K]!=B[O][K]:F.add(K)
		B[O]=L;e(B,F);A5(B)
	A7='SUDBT';A8='SUDWN';p=['EASY',AB,'HARD',AC]
	def A9(name):
		try:A=[j(A)for A in q(k.recall_list(name))];return(A+[0,0,0,0])[:4]
		except r:return[0,0,0,0]
	def AA(name,v):
		try:k.store_list(name,[float(A)for A in v])
		except r:pass
	def Aj(sel,best,wins):
		D=sel;F((18,19,24));C.fill_rect(-1,-1,321,211);J,K,E=22,20,18;F(z);C.fill_rect(J,K,3*E,3*E);O={0:'5',2:'3',4:'7',6:'1',8:'9'}
		for H in A(9):
			L,N=I(H,3);F((244,244,248)if(L+N)%2==0 else(210,214,224));C.fill_rect(J+N*E+1,K+L*E+1,E-2,E-2)
			if H in O:W(J+N*E+4,K+L*E+20,O[H],(36,82,214))
		W(96,40,AD,(250,205,70));W(96,64,'a new puzzle',(150,160,176));W(96,82,'every time',(150,160,176));B(160,108,'1-9 place   0/DEL erase',(170,174,184));B(160,126,'2nd notes   ENTER hint',(170,174,184))
		while G:
			F((18,19,24));C.fill_rect(-1,138,321,72);Q=p[D];B(160,158,'< '+Q+' >',(250,210,90));P=best[D];R=wins[D];S='best '+(A2(P)if P else'--')+'   won '+M(R);B(160,180,S,(150,200,250));B(160,202,'ENTER play    CLEAR quit',(120,126,138));H=o()
			if H==45:return
			elif H==24:D=(D-1)%4
			elif H==26:D=(D+1)%4
			elif H==105:return D
	def Ak(diff):F((18,19,24));C.fill_rect(-1,-1,321,211);B(160,96,'Generating '+diff,(240,220,120));B(160,120,'please wait...',(150,156,168))
	def Al(diff,best,wins):
		K=diff;F=best;Ak(K);N=t.randint
		try:t.seed(j(l.monotonic()*1000)&2147483647)
		except r:pass
		A=Ac(K,N);O=l.monotonic();Ag(A)
		while G:
			B=o()
			if B==45:return'quit'
			elif B==24:C,E=I(A[J],9);g(A,C*9+(E-1)%9)
			elif B==26:C,E=I(A[J],9);g(A,C*9+(E+1)%9)
			elif B==25:C,E=I(A[J],9);g(A,(C-1)%9*9+E)
			elif B==34:C,E=I(A[J],9);g(A,(C+1)%9*9+E)
			elif B==21:A[S]=not A[S];A4(A)
			elif B in(102,23):A6(A)
			elif B==105:Ai(A)
			elif B in A1:Ah(A,A1[B])
			else:continue
			if AR(A[D]):
				L=j(l.monotonic()-O);H=p.index(K);wins[H]+=1;AA(A8,wins);M=F[H]==0 or L<F[H]
				if M:F[H]=L;AA(A7,F)
				Am(A,L,M);return'won'
	def Am(st,sec,newbest):
		F((16,40,24));C.fill_rect(P,-1,f+1,211);F((30,90,50));C.draw_rect(P,0,f-1,208);B(E,40,'SOLVED!',(120,250,150));B(E,72,A2(sec),(240,244,250))
		if newbest:B(E,98,'NEW BEST',(250,210,90))
		elif st[a]:B(E,98,M(st[a])+' hints',(170,176,186))
		B(E,150,'ENTER new',(200,206,216));B(E,172,'<> menu',(200,206,216));B(E,194,'CLEAR quit',(140,146,158))
	def An():
		B=A9(A7);D=A9(A8);A=1
		while G:
			E=Aj(A,B,D)
			if E is N:break
			A=E;H=p[A]
			while G:
				I=Al(H,B,D)
				if I=='quit':break
				F=o()
				if F==45:break
				if F in(24,26,25,34):break
		C.clear()
	An()