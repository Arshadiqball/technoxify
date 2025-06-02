import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Card,
  Text,
  Button,
  ButtonGroup,
  Badge,
  BlockStack,
  InlineStack,
  Divider,
  Modal,
  TextContainer,
  AppProvider,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";
import { redirect } from "@remix-run/node";
import polarisTranslations from "@shopify/polaris/locales/en.json";

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const orderId = `gid://shopify/Order/${params.id}`;

  const response = await admin.graphql(`
    query GetOrder($id: ID!) {
      order(id: $id) {
        id
        name
        email
        phone
        note
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
        cancelledAt
        cancelReason
        customer {
          id
          firstName
          lastName
          email
        }
        shippingAddress {
          firstName
          lastName
          address1
          address2
          city
          province
          country
          zip
        }
        lineItems(first: 50) {
          edges {
            node {
              id
              title
              quantity
              variant {
                id
                title
                price
              }
            }
          }
        }
      }
    }
  `, {
    variables: { id: orderId },
  });

  const { data: { order } } = await response.json();

  if (!order) {
    throw new Response("Order not found", { status: 404 });
  }

  return { order };
};

export const action = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const action = formData.get("action");
  const orderId = `gid://shopify/Order/${params.id}`;

  try {
    if (action === "cancel") {
      const response = await admin.graphql(`
        mutation OrderCancel($id: ID!, $reason: OrderCancelReason) {
          orderCancel(id: $id, reason: $reason) {
            order {
              id
              cancelledAt
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          id: orderId,
          reason: "OTHER"
        },
      });

      const { data } = await response.json();

      if (data.orderCancel.userErrors.length > 0) {
        return { 
          error: data.orderCancel.userErrors[0].message,
          success: null 
        };
      }

      return { 
        success: "Order cancelled successfully",
        error: null 
      };
    }

    if (action === "delete") {
      const response = await admin.graphql(`
        mutation OrderDelete($id: ID!) {
          orderDelete(id: $id) {
            deletedOrderId
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: { id: orderId },
      });

      const { data } = await response.json();

      if (data.orderDelete.userErrors.length > 0) {
        return { 
          error: data.orderDelete.userErrors[0].message,
          success: null 
        };
      }

      return redirect("/orders");
    }
  } catch (error) {
    return { 
      error: error.message,
      success: null 
    };
  }

  return { error: "Invalid action", success: null };
};

export default function OrderDetail() {
  const { order } = useLoaderData();
  const fetcher = useFetcher();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isLoading = fetcher.state === "submitting";
  const isCancelled = order.cancelledAt !== null;

  return (
    <AppProvider i18n={polarisTranslations}>
      <Page
        title={`Order ${order.name}`}
        backAction={{ url: "/orders" }}
        primaryAction={
          !isCancelled ? {
            content: "Cancel Order",
            onAction: () => setShowCancelModal(true),
            destructive: true,
          } : null
        }
        secondaryActions={[
          {
            content: "Delete Order",
            onAction: () => setShowDeleteModal(true),
            destructive: true,
          },
        ]}
      >
      {fetcher.data?.success && (
        <Card>
          <Text variant="bodyMd" color="success">
            {fetcher.data.success}
          </Text>
        </Card>
      )}

      {fetcher.data?.error && (
        <Card>
          <Text variant="bodyMd" color="critical">
            {fetcher.data.error}
          </Text>
        </Card>
      )}

      <Card>
        <BlockStack gap="400">
          <InlineStack distribution="equalSpacing">
            <BlockStack gap="200">
              <Text variant="headingMd">Order Information</Text>
              <Text variant="bodyMd">Order: {order.name}</Text>
              <Text variant="bodyMd">Email: {order.email || 'N/A'}</Text>
              <Text variant="bodyMd">Phone: {order.phone || 'N/A'}</Text>
              <Text variant="bodyMd">
                Total: {order.totalPriceSet.shopMoney.amount} {order.totalPriceSet.shopMoney.currencyCode}
              </Text>
            </BlockStack>

            <BlockStack gap="200">
              <Text variant="headingMd">Status</Text>
              <Badge status={getFinancialStatusColor(order.displayFinancialStatus)}>
                {order.displayFinancialStatus}
              </Badge>
              <Badge status={getFulfillmentStatusColor(order.displayFulfillmentStatus)}>
                {order.displayFulfillmentStatus}
              </Badge>
              {isCancelled && (
                <Badge status="critical">
                  Cancelled {order.cancelReason ? `(${order.cancelReason})` : ''}
                </Badge>
              )}
            </BlockStack>
          </InlineStack>

          <Divider />

          {order.customer && (
            <>
              <Text variant="headingMd">Customer</Text>
              <Text variant="bodyMd">
                {order.customer.firstName} {order.customer.lastName}
              </Text>
              <Text variant="bodyMd">{order.customer.email}</Text>
              <Divider />
            </>
          )}

          {order.shippingAddress && (
            <>
              <Text variant="headingMd">Shipping Address</Text>
              <BlockStack gap="200">
                <Text variant="bodyMd">
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                </Text>
                <Text variant="bodyMd">{order.shippingAddress.address1}</Text>
                {order.shippingAddress.address2 && (
                  <Text variant="bodyMd">{order.shippingAddress.address2}</Text>
                )}
                <Text variant="bodyMd">
                  {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.zip}
                </Text>
                <Text variant="bodyMd">{order.shippingAddress.country}</Text>
              </BlockStack>
              <Divider />
            </>
          )}

          <Text variant="headingMd">Line Items</Text>
          {order.lineItems.edges.map(({ node: item }) => (
            <InlineStack key={item.id} distribution="equalSpacing">
              <BlockStack gap="200">
                <Text variant="bodyMd" fontWeight="bold">{item.title}</Text>
                <Text variant="bodyMd">{item.variant?.title}</Text>
              </BlockStack>
              <BlockStack gap="200">
                <Text variant="bodyMd">Quantity: {item.quantity}</Text>
                <Text variant="bodyMd">Price: {item.variant?.price}</Text>
              </BlockStack>
            </InlineStack>
          ))}
        </BlockStack>
      </Card>

      <Modal
        open={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Order"
        primaryAction={{
          content: "Cancel Order",
          onAction: () => {
            fetcher.submit(
              { action: "cancel" },
              { method: "post" }
            );
            setShowCancelModal(false);
          },
          destructive: true,
          loading: isLoading,
        }}
        secondaryActions={[
          {
            content: "Keep Order",
            onAction: () => setShowCancelModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <Text variant="bodyMd">
              Are you sure you want to cancel this order? This action cannot be undone.
            </Text>
          </TextContainer>
        </Modal.Section>
      </Modal>

      <Modal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Order"
        primaryAction={{
          content: "Delete Order",
          onAction: () => {
            fetcher.submit(
              { action: "delete" },
              { method: "post" }
            );
            setShowDeleteModal(false);
          },
          destructive: true,
          loading: isLoading,
        }}
        secondaryActions={[
          {
            content: "Keep Order",
            onAction: () => setShowDeleteModal(false),
          },
        ]}
      >
        <Modal.Section>
          <TextContainer>
            <Text variant="bodyMd">
              Are you sure you want to delete this order? This action cannot be undone and will permanently remove the order from your store.
            </Text>
          </TextContainer>
        </Modal.Section>
      </Modal>
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
      return 'critical';
    default:
      return 'subdued';
  }
}