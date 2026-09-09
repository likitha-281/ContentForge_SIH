import os
import ssl
import pg8000.native

def run():
    sql_path = os.path.join('supabase', 'migrations', '20260909_consolidated_clean.sql')
    with open(sql_path, 'r', encoding='utf-8') as f:
        sql_script = f.read()

    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE

    print('Connecting to Supabase PostgreSQL at aws-0-ap-northeast-2.pooler.supabase.com:5432...')
    conn = pg8000.native.Connection(
        'postgres.toqcdcapidfcgxfdqcvy',
        host='aws-0-ap-northeast-2.pooler.supabase.com',
        port=5432,
        password='Likitha@1209',
        database='postgres',
        ssl_context=ctx,
        timeout=180
    )

    print('Executing consolidated migration...')
    try:
        conn.run(sql_script)
        print('>>> MIGRATION EXECUTED SUCCESSFULLY! <<<')
    except Exception as e:
        print('Notice:', e)

    tables = conn.run("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;")
    print('\n========================================')
    print('VERIFIED PUBLIC TABLES IN SUPABASE POSTGRESQL:')
    print('========================================')
    for t in tables:
        print('  [TABLE]', t[0])

    try:
        buckets = conn.run("SELECT id, name, public FROM storage.buckets ORDER BY name;")
        print('\n========================================')
        print('VERIFIED STORAGE BUCKETS IN SUPABASE:')
        print('========================================')
        for b in buckets:
            print('  [BUCKET]', b[1], f'(public: {b[2]})')
    except Exception as e:
        print('Bucket check notice:', e)

    conn.close()

if __name__ == '__main__':
    run()
