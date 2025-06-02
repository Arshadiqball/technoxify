import { Outlet } from "@remix-run/react";
import { Frame, Navigation } from "@shopify/polaris";
import { useNavigate } from "@remix-run/react";

export default function AppLayout() {
  const navigate = useNavigate();

  return (
    <Frame
      navigation={
        <Navigation location="/">
          <Navigation.Section
            title="Customers"
            items={[
              {
                label: "Customer List",
                onClick: () => navigate("/customers"),
              },
            ]}
          />
          <Navigation.Section
            title="Orders"
            items={[
              {
                label: "Order List",
                onClick: () => navigate("/orders"), // coming soon
              },
            ]}
          />
          <Navigation.Section
            title="Products"
            items={[
              {
                label: "Product List",
                onClick: () => navigate("/products"),
              },
            ]}
          />
        </Navigation>
      }
    >
      <Outlet />
    </Frame>
  );
}
