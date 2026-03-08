from cassandra.cluster import Cluster
import os, time
_session = None

def get_session():
    global _session
    if _session is None:
        hosts = os.getenv('CASSANDRA_HOSTS','cassandra').split(',')
        for i in range(20):
            try:
                c = Cluster(hosts)
                s = c.connect()
                s.execute("CREATE KEYSPACE IF NOT EXISTS ent WITH replication = {'class':'SimpleStrategy','replication_factor':1}")
                s.set_keyspace('ent')
                _session = s
                return _session
            except Exception as e:
                print(f"Cassandra retry {i+1}/20: {e}")
                time.sleep(5)
        raise RuntimeError("Cannot connect to Cassandra")
    return _session
