import ssl
import pg8000.native

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE
conn = pg8000.native.Connection('postgres.toqcdcapidfcgxfdqcvy', host='aws-0-ap-northeast-2.pooler.supabase.com', port=5432, password='Likitha@1209', database='postgres', ssl_context=ctx)

# Auto confirm all users
conn.run("UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;")

# Auto confirm trigger
conn.run("""
CREATE OR REPLACE FUNCTION public.auto_confirm_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := now();
  END IF;
  RETURN NEW;
END;
$$;
""")

conn.run("DROP TRIGGER IF EXISTS tr_auto_confirm_new_user ON auth.users;")
conn.run("""
CREATE TRIGGER tr_auto_confirm_new_user
BEFORE INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.auto_confirm_new_user();
""")

print(">>> SUCCESS: Auto-confirm trigger installed on auth.users! <<<")

users = conn.run("SELECT email, email_confirmed_at FROM auth.users ORDER BY created_at DESC;")
for u in users:
    print("  User:", u[0], "| Confirmed:", u[1])

conn.close()
