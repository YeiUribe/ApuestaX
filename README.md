# ApuestaX — Plataforma Políglota de Pronósticos Deportivos (Liga BetPlay Dimayor)

**ApuestaX** es una plataforma web full-stack de apuestas deportivas en tiempo real inspirada en la **Liga BetPlay Dimayor**, diseñada con una **arquitectura de persistencia políglota (5 motores de bases de datos)**, pasarela de pagos **Wompi / PSE**, liquidación automática de apuestas y diseño **100% responsive** para dispositivos móviles y escritorio.

---

## Arquitectura Multibase (Persistencia Políglota)

El sistema distribuye sus dominios funcionales en **5 motores de bases de datos** especializados y desplegados en la nube:

| Motor de Base de Datos | Dominio de Negocio | Tablas / Colecciones Principales |
| :--- | :--- | :--- |
| **1. Microsoft SQL Server (Azure SQL)** | Identidad, Usuarios, Roles, Permisos y Empresas Operadoras | `usuario`, `rol`, `modulo_sistema`, `permiso_rol`, `empresa` |
| **2. MySQL (Azure Database for MySQL)** | Deportes, Torneos, Clubes, Directores Técnicos, Jugadores, Partidos e Incidencias en Vivo | `torneo`, `jornada`, `estadio`, `equipo`, `director_tecnico`, `jugador`, `arbitro`, `partido`, `alineacion`, `evento_partido` |
| **3. PostgreSQL (Azure PostgreSQL)** | Billetera Digital, Cuotas de Mercados, Tickets de Apuesta y Movimientos Financieros ACID | `billetera`, `tipo_transaccion`, `historial_billetera`, `cuota_partido`, `ticket_apuesta`, `detalle_ticket`, `pago_pse_ticket` |
| **4. MongoDB Atlas (NoSQL Documental)** | Reglas Dinámicas de Negocio, Catálogo de Mercados y Auditoría de Eventos / Accesos | `reglas`, `mercados_apuesta`, `login_audits` |
| **5. Google Firebase (Firestore)** | Pasarela de Pagos en Tiempo Real (Órdenes Wompi / PSE y Webhooks de Confirmación) | `ordenes_pago`, `transacciones_pasarela` |

---

## Características Principales

- **Autenticación Segura (JWT + Bcrypt):**
  - Registro e inicio de sesión con contraseñas encriptadas (`bcryptjs`), tokens `JWT` y bitácora de auditoría de accesos exitosos y fallidos en MongoDB.
  - **Bono de Bienvenida Automático:** Todo usuario nuevo recibe **$20.000 COP** acreditados automáticamente en su billetera de PostgreSQL listos para apostar.
- **Mercados Deportivos Completos (Liga BetPlay 2026):**
  - Escudos oficiales de los 16 clubes, estadios, árbitros, directores técnicos actuales y plantillas 2026.
  - **Mercados del Partido:** `Gana Local (1)`, `Empate (X)`, `Gana Visitante (2)`, `Más de 2.5 Goles`, `Menos de 2.5 Goles` y `Ambos Marcan`.
  - **Centro del Partido y Apuestas de Jugadores:** Vista dedicada por encuentro para apostar a **Goleador en cualquier momento (`Gol: <Jugador>`)** y **Amonestación (`Tarjeta: <Jugador>`)**, además de alineaciones e incidencias minuto a minuto.
- **Cupón de Apuesta Interactivo y Responsive:**
  - Apuestas simples y combinadas con cálculo automático de cuota multiplicada y ganancia potencial.
  - Barra flotante inferior y modal rápido de confirmación adaptado a teléfonos móviles, tablets y escritorio.
- **Cajero Wompi / PSE, Bonos y Puntos ApuestaX:**
  - Recargas con firma de integridad SHA-256 (`Wompi Sandbox / PSE / Nequi`), retiros bancarios, redención de códigos promocionales (`WOMPI100`, `BETPLAY20`, `SUPERCUOTA`) y canje de puntos por saldo jugable.
- **Liquidación Automática de Tickets:**
  - Cuando un partido cambia a estado `Finalizado` o registra goles/tarjetas en vivo, el motor liquida automáticamente los tickets pendientes (`Ganada` / `Perdida`) y acredita las ganancias en la billetera del usuario.

---

## Estructura del Repositorio

```text
usermanager/
├── backend/                        # API REST en Node.js + Express
│   ├── src/
│   │   ├── config/                 # Conexiones a SQL Server, MySQL, PostgreSQL, MongoDB y Firebase
│   │   ├── middlewares/            # Validación JWT y control de acceso por roles (RBAC)
│   │   ├── modules/
│   │   │   ├── betting/            # Billetera, cuotas, tickets y liquidación (PostgreSQL)
│   │   │   ├── payments/           # Órdenes Wompi / PSE y webhooks (Firebase + PostgreSQL)
│   │   │   ├── rules/              # Reglas dinámicas y auditoría (MongoDB)
│   │   │   └── sports/             # Ligas, equipos, jugadores y partidos en vivo (MySQL)
│   │   ├── services/               # Servicio de liquidación automática de apuestas
│   │   └── server.js               # Punto de entrada del servidor Express
│   └── package.json
└── frontend/                       # SPA en React 19 + Vite + Tailwind CSS
    ├── src/
    │   ├── components/
    │   │   ├── Login.jsx           # Autenticación y registro responsive con alertas en vivo
    │   │   ├── WelcomeDashboard.jsx# Pantalla de inicio, pozos acumulados y apuestas rápidas
    │   │   ├── MatchesPanel.jsx    # Partidos, Centro del Partido (Jugadores/DTs) y Cupón
    │   │   ├── WalletPanel.jsx     # Cajero Wompi/PSE, Mis Apuestas, Bonos y Reglas
    │   │   ├── TeamShield.jsx      # Escudos oficiales de los clubes de la Liga BetPlay
    │   │   └── UserList.jsx        # Consola administrativa de usuarios y auditoría
    │   ├── services/
    │   │   └── userService.js      # Cliente HTTP Axios con interceptor JWT
    │   └── App.jsx                 # Navegación principal y sincronización de saldo en tiempo real
    └── package.json
```

---

## Configuración de Variables de Entorno

### 1. Backend (`backend/.env`)

Crea un archivo `.env` dentro de la carpeta `backend/` con la siguiente estructura:

```env
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# 1. SQL Server (Identidad y Usuarios)
DB_SERVER=tu-servidor.database.windows.net
DB_PORT=1433
DB_NAME=Apuestas
DB_USER=tu_usuario_sql
DB_PASSWORD=tu_password_sql
DB_ENCRYPT=true
DB_TRUST_SERVER_CERTIFICATE=false

# 2. MySQL (Deportes, Equipos, Jugadores y Partidos)
MYSQL_HOST=tu-servidor.mysql.database.azure.com
MYSQL_PORT=3306
MYSQL_USER=tu_usuario_mysql
MYSQL_PASSWORD=tu_password_mysql
MYSQL_DATABASE=apuestas_deportes
MYSQL_SSL=true

# 3. PostgreSQL (Billeteras, Cuotas y Tickets de Apuesta)
PG_HOST=tu-servidor.postgres.database.azure.com
PG_PORT=5432
PG_USER=tu_usuario_pg
PG_PASSWORD=tu_password_pg
PG_DATABASE=apuestas_cuentas
PG_SSL=true

# 4. MongoDB Atlas (Reglas y Auditoría)
MONGO_URI=mongodb+srv://usuario:password@cluster.mongodb.net/apuestas_logs

# 5. Firebase y Pasarela Wompi / PSE
FIREBASE_PROJECT_ID=apuestax-pagos
JWT_SECRET=tu_clave_secreta_jwt
WOMPI_PUBLIC_KEY=pub_test_ApuestaXSandbox2026
WOMPI_INTEGRITY_SECRET=test_integrity_secret_apuestax_2026
WOMPI_EVENTS_SECRET=test_events_secret_apuestax_2026
```

### 2. Frontend (`frontend/.env` opcional para producción)

```env
VITE_API_URL=https://tu-backend-en-azure.azurewebsites.net/api/
```

---

## Instalación y Ejecución Local

### 1. Iniciar el Backend
```bash
cd backend
npm install
npm run dev
```
El servidor API estará disponible en `http://localhost:5000` (puedes verificar el estado de las 5 bases de datos en `http://localhost:5000/api/health`).

### 2. Iniciar el Frontend
```bash
cd frontend
npm install
npm run dev
```
La aplicación web se abrirá en `http://localhost:5173`.

---

## Endpoints Principales de la API

- `GET /api/health` — Diagnóstico en vivo de conexión a SQL Server, MySQL, PostgreSQL, MongoDB y Firebase.
- `POST /api/auth/login` y `POST /api/auth/register` — Autenticación JWT y registro con Bono de Bienvenida.
- `GET /api/sports/matches` y `GET /api/sports/players` — Partidos, técnicos y plantillas actuales de la Liga BetPlay.
- `GET /api/betting/odds` — Cuotas de mercados (`1X2`, `Goles`, `Ambos Marcan`, `Gol: <Jugador>`, `Tarjeta: <Jugador>`).
- `GET /api/betting/wallet/:cedula` — Saldo disponible e historial de movimientos en PostgreSQL.
- `POST /api/betting/tickets` — Creación transaccional de tickets de apuesta (Billetera o PSE).
- `POST /api/payments/prepare` y `POST /api/payments/webhook` — Integración con pasarela Wompi / PSE y Firebase.

---

**ApuestaX © 2026** — Proyecto Académico de Ingeniería de Software y Bases de Datos Políglotas.
