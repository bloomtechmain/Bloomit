
# Testing the Multi-Tenant Application

This document provides instructions on how to test the multi-tenant functionality of the application.

## 1. Prerequisites

- Ensure you have the application running locally.
- You have a PostgreSQL database running and the `.env` file in the `backend` directory is configured with the correct `DATABASE_URL`.

## 2. Setting up the Database

First, you need to set up the database with the multi-tenancy schema. Run the following command from the `backend` directory:

```bash
npm run db:setup-multitenancy
```

This will create the `public.tenants` table and add the `tenant_id` column to the `public.users` table.

## 3. Creating Test Tenants and Users

Next, run the example script to create two test tenants ("Tenant A" and "Tenant B") and a user for each. Run the following command from the `backend` directory:

```bash
npm run db:create-tenants-example
```

This script will:
- Create two tenants with schemas `tenant_tenant_a` and `tenant_tenant_b`.
- Create a user for each tenant:
  - **User A**: `usera@example.com` (password: `passwordA`)
  - **User B**: `userb@example.com` (password: `passwordB`)
- Insert a sample project into each tenant's `projects` table.

## 4. Verifying Data in the Database

You can connect to your PostgreSQL database and verify that the data has been created correctly.

- **Tenants Table**: Check the `public.tenants` table for the two new tenants.

  ```sql
  SELECT * FROM public.tenants;
  ```

- **Users Table**: Check the `public.users` table for the two new users, and note their `tenant_id`.

  ```sql
  SELECT id, name, email, tenant_id FROM public.users;
  ```

- **Tenant Schemas**: Verify that the tenant schemas have been created with the `projects` table in them.

  ```sql
  -- Check projects for Tenant A
  SELECT * FROM tenant_tenant_a.projects;

  -- Check projects for Tenant B
  SELECT * FROM tenant_tenant_b.projects;
  ```

## 5. Testing the API

Now you can test the API to ensure that data is properly isolated between tenants.

### 5.1. Start the Application

If the application is not already running, start it from the `backend` directory:

```bash
npm run dev
```

### 5.2. Log in as Tenant A

Use a tool like `curl` or Postman to log in as User A. This will give you an access token that is associated with Tenant A.

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"email": "usera@example.com", "password": "passwordA"}' \
  http://localhost:3000/auth/login
```

This will return a JSON response with an `accessToken`. Copy this token.

### 5.3. Access Tenant A's Data

Now, use the access token to make a request to an endpoint that returns tenant-specific data. For this example, we will assume the `/api/employee-portal/me` endpoint will be updated to return something from the tenant schema (like projects).

```bash
curl -H "Authorization: Bearer <YOUR_ACCESS_TOKEN_A>" \
  http://localhost:3000/api/employee-portal/me
```

This should return the employee record for User A.

### 5.4. Log in as Tenant B

Now, log in as User B to get an access token for Tenant B.

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"email": "userb@example.com", "password": "passwordB"}' \
  http://localhost:3000/auth/login
```

Copy the new `accessToken` for User B.

### 5.5. Access Tenant B's Data

Use the new access token to make a request to the same endpoint.

```bash
curl -H "Authorization: Bearer <YOUR_ACCESS_TOKEN_B>" \
  http://localhost:3000/api/employee-portal/me
```

This should return the employee record for User B. You should not be able to see any data from Tenant A.

## 6. Conclusion

By following these steps, you can verify that the multi-tenant implementation is working correctly and that data is properly isolated between tenants.
