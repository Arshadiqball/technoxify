
import { useLoaderData, Link } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  Badge,
  AppProvider,
  Box,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import polarisTranslations from "@shopify/polaris/locales/en.json";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query GetOrders($first: Int!) {
      orders(first: $first) {
        edges {
          node {
            id
            name
            email
            phone
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            displayFulfillmentStatus
            displayFinancialStatus
            createdAt
            updatedAt
            tags
            customer {
              id
              firstName
              lastName
            }
            shippingAddress {
              city
              province
              country
            }
            lineItems(first: 10) {
              edges {
                node {
                  quantity
                }
              }
            }
          }
        }
      }
    }
  `, {
    variables: {
      first: 250,
    },
  });

  const {
    data: {
      orders: { edges },
    },
  } = await response.json();

  return { orders: edges.map(edge => edge.node) };
};

export default function Orders() {
  const { orders } = useLoaderData();

  // Calculate total items in line items
  const getTotalItems = (order) => {
    return order.lineItems.edges.reduce((total, edge) => total + edge.node.quantity, 0);
  };

  if (orders.length === 0) {
    return (
      <AppProvider i18n={polarisTranslations}>
        <Page 
          title="Orders"
          primaryAction={{
            content: "Create order",
            url: "/app/orders/new"
          }}
        >
          <Card>
            <Box padding="1600">
              <Text variant="bodyMd" alignment="center">
                No orders found
              </Text>
            </Box>
          </Card>
        </Page>
      </AppProvider>
    );
  }

  return (
    <AppProvider i18n={polarisTranslations}>
      <Page 
        title="Orders"
        primaryAction={{
          content: "Create order",
          url: "/app/orders/new"
        }}
      >
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e1e3e5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Order</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Date</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Customer</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Channel</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Total</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Payment status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Fulfillment status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Items</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Delivery status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Delivery method</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Tags</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order, index) => (
                  <tr key={order.id} style={{ borderBottom: '1px solid #f6f6f7' }}>
                    <td style={{ padding: '12px' }}>
                      <Link to={`/orders/${order.id.split('/').pop()}`} style={{ textDecoration: 'none' }}>
                        <Text variant="bodyMd" fontWeight="bold" as="span" color="interactive">
                          {order.name}
                        </Text>
                      </Link>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Text variant="bodyMd" as="span">
                        {new Date(order.createdAt).toLocaleDateString()} at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Text variant="bodyMd" as="span">
                        {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'No customer'}
                      </Text>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Text variant="bodyMd" as="span">Online Store</Text>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Text variant="bodyMd" as="span">
                        {order.totalPriceSet.shopMoney.currencyCode} {parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}
                      </Text>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge status={getFinancialStatusColor(order.displayFinancialStatus)}>
                        {order.displayFinancialStatus}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Badge status={getFulfillmentStatusColor(order.displayFulfillmentStatus)}>
                        {order.displayFulfillmentStatus}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Text variant="bodyMd" as="span">
                        {getTotalItems(order)} item{getTotalItems(order) !== 1 ? 's' : ''}
                      </Text>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Text variant="bodyMd" as="span">-</Text>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Text variant="bodyMd" as="span">Standard</Text>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <Text variant="bodyMd" as="span">
                        {order.tags && order.tags.length > 0 ? order.tags.join(', ') : '-'}
                      </Text>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Page>
    </AppProvider>
  );
}

function getFinancialStatusColor(status) {
  switch (status) {
    case 'PAID':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'info';
    default:
      return 'critical';
  }
}

function getFulfillmentStatusColor(status) {
  switch (status) {
    case 'FULFILLED':
      return 'success';
    case 'PARTIALLY_FULFILLED':
      return 'warning';
    case 'UNFULFILLED':
      return 'warning';
    default:
      return 'subdued';
  }
}
