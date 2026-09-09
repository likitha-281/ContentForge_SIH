import ssl
import pg8000.native

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
conn = pg8000.native.Connection('postgres.toqcdcapidfcgxfdqcvy', host='aws-0-ap-northeast-2.pooler.supabase.com', port=5432, password='Likitha@1209', database='postgres', ssl_context=ctx)

conn.run("""
UPDATE auth.users 
SET encrypted_password = crypt('Operator@123', gen_salt('bf')),
    email_confirmed_at = now()
WHERE email = 'operator.test1@intelliforge.ai';
""")

res = conn.run("SELECT email, email_confirmed_at FROM auth.users WHERE email = 'operator.test1@intelliforge.ai';")
print("VERIFIED OPERATOR ACCOUNT:", res)

conn.close()
