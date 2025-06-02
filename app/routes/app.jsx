import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { AppProvider as PolarisAppProvider } from "@shopify/polaris";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import { authenticate } from "../shopify.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return { 
    apiKey: process.env.SHOPIFY_API_KEY || "",
    polarisTranslations 
  };
};

export default function App() {
  const { apiKey, polarisTranslations } = useLoaderData();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <PolarisAppProvider i18n={polarisTranslations}>
        <NavMenu>
          <Link to="/app" rel="home">
            Home
          </Link>
          <Link to="/app/additional">Additional page</Link>
          
          {/* Products Section */}
          <Link to="/app/products">Products</Link>
          <Link to="/app/products/new">Add Product</Link>
          <Link to="/app/products/collections">Collections</Link>
          <Link to="/app/products/inventory">Inventory</Link>
          <Link to="/app/products/transfers">Transfers</Link>
          
          {/* Orders Section */}
          <Link to="/app/orders">Orders</Link>
          <Link to="/app/orders/new">Create Order</Link>
          <Link to="/app/orders/drafts">Draft Orders</Link>
          <Link to="/app/orders/abandoned">Abandoned Checkouts</Link>
          
          {/* Customers Section */}
          <Link to="/customers">Customers</Link>
          <Link to="/customers/new">Add Customer</Link>
          <Link to="/customers/segments">Customer Segments</Link>
          <Link to="/customers/analytics">Customer Analytics</Link>
          
          {/* Analytics Section */}
          <Link to="/app/analytics">Analytics</Link>
          <Link to="/app/analytics/reports">Reports</Link>
          <Link to="/app/analytics/live-view">Live View</Link>
          
          {/* Marketing Section */}
          <Link to="/app/marketing">Marketing</Link>
          <Link to="/app/marketing/campaigns">Campaigns</Link>
          <Link to="/app/marketing/automations">Automations</Link>
          
          {/* Discounts Section */}
          <Link to="/app/discounts">Discounts</Link>
          <Link to="/app/discounts/new">Create Discount</Link>
          
          {/* Apps Section */}
          <Link to="/app/apps">Apps</Link>
          
          {/* Settings Section */}
          <Link to="/app/settings">Settings</Link>
          <Link to="/app/settings/general">General</Link>
          <Link to="/app/settings/payments">Payments</Link>
          <Link to="/app/settings/shipping">Shipping</Link>
          <Link to="/app/settings/notifications">Notifications</Link>
        </NavMenu>
        <Outlet />
      </PolarisAppProvider>
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
