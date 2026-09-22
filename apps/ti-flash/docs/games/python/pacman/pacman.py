# More games at ti84calcwiz.com
B0='ghosteat'
A_='fruit_eat'
Az='fruit_gone'
Ay='extralife'
Ax='fruit_spawn'
Aw='#    #         #    #'
Av='#                   #'
Au='# ## #### # #### ## #'
At='#####################'
As=Exception
AX='cols'
AW='enter'
AV='dot'
AU='extra'
AT='fruit_done'
AS='frame'
AR='house'
AQ='rel'
AE='exit'
AD='phase_t'
AC='pac'
AB=print
A0='eyes'
z='lives'
y='eaten'
x='phase_i'
w='combo'
v='tc'
u=len
t=int
q='quit'
p='fy'
o='fx'
n='norm'
m='i'
l=str
h='want'
c='rects'
e='level'
d='pell'
b=False
a=abs
Z='g'
W='fruit'
V=True
S=.0
R=float
Q='ev'
P=None
N='score'
M='fright'
K=range
I='st'
H='y'
G='x'
D='dy'
B='dx'
import random
try:import ti_draw as A,ti_system as AF,time as f;A1=V
except ImportError:
	import sys
	if sys.implementation.name=='tipython':AB('This program needs ti_draw,');AB('which your calculator is');AB('missing. 2-minute fix:');AB('calcplex.com/ti-draw-fix');raise SystemExit
	A1=b
A2=At,'#         #         #',Au,Av,Aw,'# ## #  ##D##  # ## #','        #   #        ','# ## #  #####  # ## #',Aw,Au,'#    #    #    #    #',Av,At
T,A3=21,13
C=14
AG=T*C
U,L=12,24
A4=6
AY=10,5
Be=(9,6),(10,6),(11,6)
A5=10,4
B1=(1,1),(19,1),(1,11),(19,11)
AZ=(19,1),(1,1),(19,11),(1,11)
B2=10,8
X=10,3
Aa=4,8
Ab=6,14
AH=(0,-1),(-1,0),(0,1),(1,0)
def J(i):return i*C+7
def F(v):return t(v)//C
def i(c,r):
	if r<0 or r>=A3:return b
	return A2[r][c%T]not in'#D'
def B3():
	C={}
	for A in K(A3):
		for B in K(T):
			if A2[A][B]!=' 'or A==A4:continue
			if Aa[0]<=A<=Aa[1]and Ab[0]<=B<=Ab[1]:continue
			C[B,A]=1
	for(B,A)in B1:C[B,A]=2
	return C
def B4():
	A={A5:0};D=[A5];E=0
	while E<u(D):
		F,G=D[E];E+=1
		for(H,I)in AH:
			B,C=(F+H)%T,G+I
			if i(B,C)and(B,C)not in A:A[B,C]=A[F,G]+1;D.append((B,C))
	return A
B5=B4()
A6=.07
B6=52.
B7=47.
B8=3e1
B9=3e1
BA=85.
BB=4e1
A7=(7.,0),(2e1,1),(7.,0),(2e1,1),(5.,0),(1e9,1)
BC=S,1.,5.,9.
BD=40,80
BE=1e1
Ac=100,200,300,500,700,1000
BF=10000
Ad=5.
def Ae(level):A=1.+.06*(level-1);return 1.4 if A>1.4 else A
def BG(level):A=7.-.6*(level-1);return A if A>0 else S
def BH(i):A=(10,4),(10,6),(9,6),(11,6);C,E=A[i];return{m:i,G:R(J(C)),H:R(J(E)),B:-1 if i==0 else 0,D:0,I:n if i==0 else AR,AQ:BC[i]}
def Af(st):A=st;C,E=B2;A[AC]={G:R(J(C)),H:R(J(E)),B:0,D:0,o:-1,p:0,v:P};A[h]=P;A[Z]=[BH(A)for A in K(4)];A[M]=S;A[w]=0;A[x]=0;A[AD]=A7[0][0];A[W]=S;A[AS]=0
def Ag(st):st[d]=B3();st[y]=0;st[AT]=[];Af(st)
def BI():A={e:1,N:0,z:3,AU:b,Q:[]};Ag(A);return A
def Ah(st,e,dist,decide):
	E=dist;N=0
	while E>.01 and(e[B]or e[D])and N<6:
		N+=1
		if e[B]:
			K=e[G];A=J(F(K))
			if e[B]>0:I=A if K<A-.01 else A+C
			else:I=A if K>A+.01 else A-C
			M=I-K if I>K else K-I
			if E+.02<M:e[G]=(K+e[B]*E)%AG;return
			E-=M
			if E<0:E=S
			e[G]=R(I%AG);e[H]=R(J(F(e[H])))
		else:
			L=e[H];A=J(F(L))
			if e[D]>0:I=A if L<A-.01 else A+C
			else:I=A if L>A+.01 else A-C
			M=I-L if I>L else L-I
			if E+.02<M:e[H]+=e[D]*E;return
			E-=M
			if E<0:E=S
			e[H]=R(I);e[G]=R(J(F(e[G])))
		decide(st,e)
def BJ(st,c,r):
	A=st;E=A[d].pop((c,r),0)
	if not E:return
	A[y]+=1;A[Q].append((AV,c,r)if E==1 else('power',c,r))
	if E==1:A[N]+=10
	else:
		A[N]+=50;A[w]=0;F=BG(A[e])
		for C in A[Z]:
			if C[I]==n:
				if F>0:C[I]=M
				C[B],C[D]=-C[B],-C[D]
			elif C[I]==M:C[B],C[D]=-C[B],-C[D]
		if F>0:A[M]=F
	if A[y]in BD and A[y]not in A[AT]:A[AT].append(A[y]);A[W]=BE;A[Q].append((Ax,))
	if not A[AU]and A[N]>=BF:A[AU]=V;A[z]+=1;A[Q].append((Ay,))
	if not A[d]:A[Q].append(('clear',))
def BK(st,e):
	C,E=F(e[G]),F(e[H]);A=st[h]
	if A and i(C+A[0],E+A[1]):e[B],e[D]=A;st[h]=P;e[v]=C,E
	else:
		e[v]=P
		if not i(C+e[B],E+e[D]):e[B]=e[D]=0
	if e[B]or e[D]:e[o],e[p]=e[B],e[D]
def BL(st,g):
	if A7[st[x]][1]==0:return AZ[g[m]]
	A=st[AC];B,C=F(A[G]),F(A[H]);D=g[m]
	if D==0:return B,C
	if D==1:return B+4*A[o],C+4*A[p]
	if D==2:E=st[Z][0];K,L=B+2*A[o],C+2*A[p];return 2*K-F(E[G]),2*L-F(E[H])
	I,J=F(g[G]),F(g[H])
	if(B-I)*(B-I)+(C-J)*(C-J)>64:return B,C
	return AZ[3]
def AI(st,g):
	A,C=F(g[G]),F(g[H]);J=g[I]
	if J==AE:
		if C==A4:
			if A==10:g[B],g[D]=0,-1
			else:g[B],g[D]=1 if A<10 else-1,0
		elif(A,C)==A5:g[I]=n;Ai(st,g,V)
		return
	if J==AW:
		if C==A4:g[I]=AE;g[B],g[D]=0,-1
		return
	if J==A0:
		if(A,C)==A5:g[I]=AW;g[B],g[D]=0,1;return
		E,M=P,99999;N=-g[B],-g[D]
		for(K,L)in AH:
			if(K,L)==N:continue
			O,Q=(A+K)%T,C+L
			if not i(O,Q):continue
			R=B5.get((O,Q),99999)
			if R<M:E,M=(K,L),R
		if E is P:E=N
		g[B],g[D]=E;return
	Ai(st,g,b)
def Ai(st,g,from_gate):
	J=from_gate;K,L=F(g[G]),F(g[H]);N=-g[B],-g[D];A=[]
	for(E,C)in AH:
		if(E,C)==N and not J:continue
		if J and C>0:continue
		if i((K+E)%T,L+C):A.append((E,C))
	if not A:A=[N]
	if g[I]==M:g[B],g[D]=A[st['rint'](0,u(A)-1)];return
	O,P=BL(st,g);Q,R=A[0],1<<30
	for(E,C)in A:
		S,U=(K+E)%T,L+C;V=(S-O)*(S-O)+(U-P)*(U-P)
		if V<R:Q,R=(E,C),V
	g[B],g[D]=Q
def BM(st,g):
	A=g[I]
	if A==A0:return BA
	if A in(AE,AW):return BB
	C=Ae(st[e])
	if A==M:return B8
	D=F(g[H]);B=F(g[G])
	if D==A4 and(B<=2 or B>=18):return B9
	return B7*C
def BN(st,dt,rint):
	O=dt;A=st;A['rint']=rint;A[AS]+=1;E=A[AC]
	if A[M]>0:
		A[M]-=O
		if A[M]<=0:
			A[M]=S
			for C in A[Z]:
				if C[I]==M:C[I]=n
	else:
		A[AD]-=O
		if A[AD]<=0 and A[x]<u(A7)-1:
			A[x]+=1;A[AD]=A7[A[x]][0]
			for C in A[Z]:
				if C[I]in(n,M):C[B],C[D]=-C[B],-C[D]
	if A[W]>0:
		A[W]-=O
		if A[W]<=0:A[W]=S;A[Q].append((Az,))
	L=A[h]
	if L:
		if(E[B]or E[D])and L==(-E[B],-E[D]):E[B],E[D]=L;E[o],E[p]=L;A[h]=P
		else:
			U,V=F(E[G]),F(E[H])
			if(U,V)!=E[v]and i(U+L[0],V+L[1])and a(E[G]-J(U))<=Ad and a(E[H]-J(V))<=Ad:E[G],E[H]=R(J(U)),R(J(V));E[B],E[D]=L;E[o],E[p]=L;E[v]=U,V;A[h]=P
	Ah(A,E,B6*Ae(A[e])*O,BK);b,c=E[G],E[H]
	for f in K(F(b-6),F(b+6)+1):
		for g in K(F(c-6),F(c+6)+1):
			if(f%T,g)in A[d]and a(b-J(f))<7.5 and a(c-J(g))<7.5:BJ(A,f%T,g)
	if A[W]>0:
		k,l=J(X[0]),J(X[1])
		if a(E[G]-k)<9 and a(E[H]-l)<9:A[W]=S;j=A[e]-1;Y=Ac[j if j<u(Ac)else-1];A[N]+=Y;A[Q].append((A_,Y))
	for C in A[Z]:
		if C[I]==AR:
			C[AQ]-=O
			if C[AQ]<=0:C[I]=AE;AI(A,C)
		if C[I]==AR:continue
		if(A[AS]+C[m])%2:continue
		Ah(A,C,BM(A,C)*O*2.,AI)
	for C in A[Z]:
		if C[I]not in(n,M):continue
		if a(C[G]-E[G])<9 and a(C[H]-E[H])<9:
			if C[I]==M:
				Y=200<<A[w]
				if A[w]<3:A[w]+=1
				A[N]+=Y;C[I]=A0;C[G]=R(J(F(C[G])));C[H]=R(J(F(C[H])));AI(A,C);A[Q].append((B0,C[m],Y))
			else:A[Q].append(('died',));return
j,A8=319,209
BO=10
BP=6
Aj=48,90,235
A9=255,200,150
k=255,220,0
Ak=(255,60,60),(255,150,200),(90,220,255),(255,170,60)
BQ=70,80,255
Al=235,235,255
BR=230,230,230
AJ=255,140,180
BS=255,70,50
AK=255,255,160
O=U+AY[0]*C,L+AY[1]*C+5,C,4
def E(c):A.set_color(c[0],c[1],c[2])
def Y(y,txt,cx=159):A.draw_text(cx-(u(txt)*10-2)//2,y,txt)
def BT(e):A=BP if e.get(I)==A0 else BO;return U+t(e[G])-A//2,L+t(e[H])-A//2,A,A
def r(c,r,v):
	if v==2:return U+c*C+3,L+r*C+3,8,8
	return U+c*C+5,L+r*C+5,4,4
def g(a,b):return a[0]<b[0]+b[2]and b[0]<a[0]+a[2]and a[1]<b[1]+b[3]and b[1]<a[1]+a[3]
def Am(old,new,out):
	E=out;D=old
	if not g(D,new):E.append((D[0],D[1],D[2]+1,D[3]+1));return
	A,B,J,H=D;C,F,I,K=new
	if C>A:E.append((A,B,C-A+1,H+1))
	if C+I<A+J:E.append((C+I,B,A+J-C-I+1,H+1))
	G,L=max(A,C),min(A+J,C+I)
	if L>G:
		if F>B:E.append((G,B,L-G+1,F-B+1))
		if F+K<B+H:E.append((G,F+K,L-G+1,B+H-F-K+1))
def BU(st,g):
	if g[I]==A0:return BR
	if g[I]==M:
		if st[M]<2. and t(st[M]*4)%2:return Al
		return BQ
	return Ak[g[m]]
def BV():E(BS);B,D=U+X[0]*C,L+X[1]*C;A.fill_rect(B+3,D+5,8,7);E((90,200,80));A.fill_rect(B+6,D+2,3,4)
def AL(st):
	F,G=U+X[0]*C,L+X[1]*C;A.set_color(0,0,0);A.fill_rect(F+2,G+1,11,12);D=st[d].get(X)
	if D:E(A9);B=r(X[0],X[1],D);A.fill_rect(B[0],B[1],B[2],B[3])
def An(st):
	A.set_color(0,0,0);A.fill_rect(-1,-1,j+2,A8+2);E(Aj)
	for D in K(A3):
		B=0
		while B<T:
			if A2[D][B]=='#':
				G=B
				while B<T and A2[D][B]=='#':B+=1
				A.fill_rect(U+G*C,L+D*C,(B-G)*C,C)
			else:B+=1
	E(AJ);A.fill_rect(O[0],O[1],O[2],O[3]);E(A9)
	for((B,D),H)in st[d].items():F=r(B,D,H);A.fill_rect(F[0],F[1],F[2],F[3])
	AM(st)
def Ao(st):A.set_color(0,0,0);A.fill_rect(4,2,110,20);E(AK);A.draw_text(4,20,l(st[N]))
def AM(st):
	A.set_color(0,0,0);A.fill_rect(-1,-1,j+2,L-2+1);Ao(st);E((160,170,200));A.draw_text(120,20,'HI '+l(st.get('hi',0)));A.draw_text(226,20,'L'+l(st[e]));E(k);B=st[z]-1
	for C in K(B if B<5 else 5):A.fill_rect(262+C*12,7,9,9)
def Ap(on):
	B=L+J(8)
	if on:E(AK);Y(B+12,'READY!')
	else:A.set_color(0,0,0);A.fill_rect(126,B-7,68,15)
def AN():return{c:[P]*5,AX:[P]*5,'sd':S}
def AO(st,R,now,eaten=P,poll=P):
	i=eaten;T=poll;G=st;l=G[AC];m=[l]+G[Z];H=[]
	for B in K(5):n=m[B];W=k if B==0 else BU(G,G[Z][B-1]);D=BT(n);H.append((D,W))
	for B in K(5):
		D,W=H[B]
		if D==R[c][B]and W==R[AX][B]:continue
		E(W);A.fill_rect(D[0],D[1],D[2],D[3])
	if T:T()
	Q=[]
	for B in K(5):
		h=R[c][B];D=H[B][0]
		if h and h!=D:Am(h,D,Q)
	if i:
		for(X,Y,a)in i:Am(r(X,Y,a),H[0][0],Q)
	A.set_color(0,0,0)
	for(I,J,M,P)in Q:
		if I<0:M+=I;I=0
		if J<L-1:P-=L-1-J;J=L-1
		if I+M>j:M=j-I
		if J+P>A8:P=A8-J
		if M>=2 and P>=2:A.fill_rect(I,J,M,P)
	if T:T()
	e=[]
	for F in Q:
		o,p=(F[0]-U)//C,(F[1]-L)//C;q,s=(F[0]+F[2]-U)//C,(F[1]+F[3]-L)//C
		for Y in K(p,s+1):
			for X in K(o,q+1):
				a=G[d].get((X,Y))
				if not a:continue
				f=r(X,Y,a)
				if not g(f,F):continue
				S=b
				for(D,t)in H:
					if g(f,D):S=V;break
				if not S and f not in e:e.append(f)
	if e:
		E(A9)
		for(I,J,M,P)in e:A.fill_rect(I,J,M,P)
	for F in Q:
		if g(F,O):
			S=b
			for(D,t)in H:
				if g(O,D):S=V;break
			if not S:E(AJ);A.fill_rect(O[0],O[1],O[2],O[3])
			break
	for B in K(5):R[c][B]=H[B][0];R[AX][B]=H[B][1]
	if G[N]!=R.get(N)and now-R['sd']>.4:Ao(G);R[N]=G[N];R['sd']=now
def s():return AF.get_key(0)
def Aq():
	while s()!=0:pass
	while V:
		A=s()
		if A!=0:
			while s()!=0:pass
			return A
def BW():
	if not A1:return 0
	try:return t(list(AF.recall_list('HIPAC'))[0])
	except As:return 0
def BX(v):
	if A1:
		try:AF.store_list('HIPAC',[R(v)])
		except As:pass
def AA(secs):
	A=f.monotonic()
	while f.monotonic()-A<secs:
		if s()==45:return b
	return V
Ar={25:(0,-1),34:(0,1),24:(-1,0),26:(1,0)}
def BY(st,R):
	A.set_color(0,0,0)
	for B in R[c]:
		if B:A.fill_rect(B[0],B[1],B[2]+1,B[3]+1)
	D=[]
	for B in R[c]:
		if not B:continue
		G,H=(B[0]-U)//C,(B[1]-L)//C
		for I in K(H,H+2):
			for J in K(G,G+2):
				M=st[d].get((J,I))
				if M:
					F=r(J,I,M)
					if g(F,B)and F not in D:D.append(F)
	if D:
		E(A9)
		for(N,P,Q,S)in D:A.fill_rect(N,P,Q,S)
	for B in R[c]:
		if B and g(B,O):E(AJ);A.fill_rect(O[0],O[1],O[2],O[3]);break
def BZ(R):
	B=R[c][0]
	for C in K(6):
		if C%2==0:E(k);A.fill_rect(B[0],B[1],B[2],B[3])
		else:A.set_color(0,0,0);A.fill_rect(B[0],B[1],B[2]+1,B[3]+1)
		if not AA(.15):break
def AP(st,R):Ap(V);A=AA(1.2);Ap(b);AO(st,R,S);return A
def Ba(st):
	B=st;An(B);D=AN()
	if not AP(B,D):return q
	R=[]
	def J():
		A=s()
		if A==45:R.append(1)
		elif A in Ar:B[h]=Ar[A]
	H=f.monotonic()
	while V:
		M=f.monotonic();I=M-H;H=M
		if I>A6*2:I=A6*2
		elif I<A6*.4:I=A6*.4
		J();BN(B,I,random.randint);J();O=P
		for F in B[Q]:
			if F[0]==AV or F[0]=='power':
				if O is P:O=[]
				O.append((F[1],F[2],1 if F[0]==AV else 2))
		AO(B,D,M,O,J)
		if R:return q
		T=B[Q];B[Q]=[]
		for F in T:
			G=F[0]
			if G==Ax:BV()
			elif G in(Az,A_):AL(B)
			elif G==Ay:AM(B);D[N]=B[N]
			elif G==B0:AO(B,D,M);AA(.25);H=f.monotonic()
			elif G=='died':
				if B[W]>0:B[W]=S;AL(B)
				BY(B,D);BZ(D);B[z]-=1
				if B[z]<=0:return'over'
				Af(B);B[Q]=[];AM(B);D=AN()
				if not AP(B,D):return q
				H=f.monotonic();break
			elif G=='clear':
				if B[W]>0:AL(B)
				for X in K(4):E(Al if X%2==0 else Aj);A.draw_rect(U,L,AG-1,A3*C-1);AA(.2)
				B[e]+=1;Ag(B);B[Q]=[];An(B);D=AN()
				if not AP(B,D):return q
				H=f.monotonic();break
		J()
		if R:return q
def Bb(st):C,D=150,128;F,B=(j-C)//2,L+20;E(k);A.fill_rect(F,B,C,D);A.set_color(0,0,0);A.fill_rect(F+3,B+3,C-6,D-6);E((255,90,70));Y(B+30,'GAME OVER');E((235,240,250));Y(B+56,'Score '+l(st[N]));Y(B+76,'Level '+l(st[e]));E((150,172,205));Y(B+100,'ENTER again');Y(B+118,'CLEAR menu');return Aq()!=45
def Bc(hi):
	A.set_color(0,0,0);A.fill_rect(-1,-1,j+2,A8+2);E(k);Y(56,'P A C - M A N');E(k);A.fill_rect(70,92,18,18)
	for B in K(4):E(Ak[B]);A.fill_rect(140+B*30,92,18,18)
	E((230,230,230))
	for B in K(4):A.fill_rect(143+B*30,96,4,4);A.fill_rect(151+B*30,96,4,4)
	E(AK);Y(150,'BEST '+l(hi));E((150,172,205));Y(180,'ENTER play   CLEAR quit');return Aq()!=45
def Bd():
	B=BW()
	while V:
		if not Bc(B):break
		D=V
		while D:
			C=BI();C['hi']=B;E=Ba(C)
			if C[N]>B:B=C[N];BX(B)
			if E==q:break
			D=Bb(C)
	A.clear()
if A1:Bd()