-- Only for the ephemeral PostgreSQL service in ci.yml.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE palermo_ci LOGIN PASSWORD 'palermo_ci_fixture'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE SCHEMA palermo AUTHORIZATION palermo_ci;
CREATE SCHEMA palermo_test AUTHORIZATION palermo_ci;
REVOKE ALL ON SCHEMA palermo, palermo_test FROM PUBLIC;
ALTER ROLE palermo_ci SET search_path = palermo;
