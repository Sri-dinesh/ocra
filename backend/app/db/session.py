import uuid
from sqlalchemy import create_engine, event
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import shapely.wkt
import shapely.wkb

from app.core.config import settings

SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL or "sqlite:///./app.db"
connect_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    def _wkt_to_wkb_bytes(wkt_or_ewkt, *args):
        if not wkt_or_ewkt:
            return None
        s = str(wkt_or_ewkt)
        if ";" in s:
            s = s.split(";")[-1]
        geom = shapely.wkt.loads(s)
        return shapely.wkb.dumps(geom, hex=False, srid=4326)

    @event.listens_for(engine, "connect")
    def setup_sqlite_spatial_functions(dbapi_conn, conn_record):
        if hasattr(dbapi_conn, "create_function"):
            dbapi_conn.create_function("AsEWKB", 1, lambda x: x)
            dbapi_conn.create_function("AsBinary", 1, lambda x: x)
            dbapi_conn.create_function("ST_AsEWKB", 1, lambda x: x)
            dbapi_conn.create_function("ST_AsBinary", 1, lambda x: x)
            dbapi_conn.create_function("RecoverGeometryColumn", 5, lambda *args: 1)
            dbapi_conn.create_function("InitSpatialMetaData", 1, lambda *args: 1)
            dbapi_conn.create_function("CreateSpatialIndex", 2, lambda *args: 1)
            dbapi_conn.create_function("CheckSpatialIndex", 2, lambda *args: None)
            dbapi_conn.create_function("DisableSpatialIndex", 2, lambda *args: 1)
            dbapi_conn.create_function("DiscardGeometryColumn", 2, lambda *args: 1)
            dbapi_conn.create_function("DropSpatialTable", 1, lambda *args: 1)
            dbapi_conn.create_function("DropGeometryColumn", 2, lambda *args: 1)
            dbapi_conn.create_function("DropGeometryTable", 1, lambda *args: 1)
            dbapi_conn.create_function("ST_GeomFromText", 2, _wkt_to_wkb_bytes)
            dbapi_conn.create_function("GeomFromEWKT", 1, _wkt_to_wkb_bytes)
            dbapi_conn.create_function("GeomFromText", 2, _wkt_to_wkb_bytes)
            dbapi_conn.create_function("ST_GeomFromEWKT", 1, _wkt_to_wkb_bytes)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def generate_uuid():
    return uuid.uuid4()
