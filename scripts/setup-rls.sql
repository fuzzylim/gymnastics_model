-- Row Level Security Setup for Multi-tenant SaaS
-- Run this script to enable RLS and create policies

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_challenges ENABLE ROW LEVEL SECURITY;

-- Create a function to get current user's tenant IDs
CREATE OR REPLACE FUNCTION auth.user_tenant_ids()
RETURNS uuid[]
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT ARRAY_AGG(DISTINCT tenant_id) 
  FROM tenant_memberships 
  WHERE user_id = auth.uid()
$$;

-- Users table policies
-- Users can only see their own record
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Service role bypass
CREATE POLICY "Service role has full access to users" ON users
  FOR ALL USING (auth.role() = 'service_role');

-- Tenants table policies
-- Users can only see tenants they belong to
CREATE POLICY "Users can view their tenants" ON tenants
  FOR SELECT USING (
    id IN (
      SELECT tenant_id FROM tenant_memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update their tenants" ON tenants
  FOR UPDATE USING (
    id IN (
      SELECT tenant_id FROM tenant_memberships 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Service role has full access to tenants" ON tenants
  FOR ALL USING (auth.role() = 'service_role');

-- Tenant memberships policies
-- Users can see memberships for their tenants
CREATE POLICY "Users can view memberships in their tenants" ON tenant_memberships
  FOR SELECT USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships tm2
      WHERE tm2.user_id = auth.uid()
    )
  );

-- Admins and owners can manage memberships
CREATE POLICY "Admins can manage memberships" ON tenant_memberships
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_memberships tm2
      WHERE tm2.user_id = auth.uid() 
      AND tm2.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Service role has full access to memberships" ON tenant_memberships
  FOR ALL USING (auth.role() = 'service_role');

-- Credentials policies
-- Users can only manage their own credentials
CREATE POLICY "Users can view own credentials" ON credentials
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own credentials" ON credentials
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Service role has full access to credentials" ON credentials
  FOR ALL USING (auth.role() = 'service_role');

-- Sessions policies
-- Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON sessions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role has full access to sessions" ON sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Auth challenges policies
-- Users can only see their own challenges
CREATE POLICY "Users can view own challenges" ON auth_challenges
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role has full access to challenges" ON auth_challenges
  FOR ALL USING (auth.role() = 'service_role');

-- Accounts policies (for OAuth if added later)
CREATE POLICY "Users can view own accounts" ON accounts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service role has full access to accounts" ON accounts
  FOR ALL USING (auth.role() = 'service_role');

-- Create performance indexes for multi-tenancy
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_id ON tenant_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_tenant_id ON tenant_memberships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_memberships_user_tenant ON tenant_memberships(user_id, tenant_id);
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_user_id ON auth_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_expires ON auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_domain ON tenants(domain);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create a view for easy tenant member queries
CREATE OR REPLACE VIEW tenant_members_view AS
SELECT 
  tm.id,
  tm.tenant_id,
  tm.user_id,
  tm.role,
  tm.joined_at,
  t.name as tenant_name,
  t.slug as tenant_slug,
  u.email as user_email,
  u.name as user_name
FROM tenant_memberships tm
JOIN tenants t ON t.id = tm.tenant_id
JOIN users u ON u.id = tm.user_id;

-- Apply RLS to the view
ALTER VIEW tenant_members_view SET (security_invoker = true);