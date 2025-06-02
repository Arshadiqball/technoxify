
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  Badge,
  Button,
  BlockStack,
  InlineStack,
  Divider,
  IndexTable,
  Thumbnail,
  EmptyState,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const customerId = `gid://shopify/Customer/${params.id}`;

  const customerResponse = await admin.graphql(`
    query getCustomer($id: ID!) {
      customer(id: $id) {
        id
        displayName
        firstName
        lastName
        email
        phone
        createdAt
        updatedAt
        acceptsMarketing
        emailMarketingConsent {
          state
        }
        smsMarketingConsent {
          state
        }
        state
        tags
        note
        verifiedEmail
        taxExempt
        defaultAddress {
          id
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phone
        }
        addresses {
          id
          firstName
          lastName
          company
          address1
          address2
          city
          province
          country
          zip
          phone
        }
        orders(first: 10) {
          edges {
            node {
              id
              name
              createdAt
              displayFulfillmentStatus
              displayFinancialStatus
              totalPriceSet {
                shopMoney {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
        numberOfOrders
        totalSpentV2 {
          amount
          currencyCode
        }
        averageOrderAmountV2 {
          amount
          currencyCode
        }
      }
    }
  `, {
    variables: { id: customerId }
  });

  const json = await customerResponse.json();
  const customer = json.data.customer;

  if (!customer) {
    throw new Response("Customer not found", { status: 404 });
  }

  return { customer };
};

export default function CustomerDetail() {
  const { customer } = useLoaderData();
  const navigate = useNavigate();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getCustomerStatus = () => {
    if (customer.state === "DISABLED") return { status: "critical", children: "Disabled" };
    if (customer.state === "INVITED") return { status: "warning", children: "Invited" };
    if (customer.state === "DECLINED") return { status: "attention", children: "Declined" };
    if (!customer.verifiedEmail) return { status: "warning", children: "Unverified" };
    return { status: "success", children: "Active" };
  };

  const orderRows = customer.orders.edges.map(({ node: order }, index) => (
    <IndexTable.Row id={order.id} key={order.id} position={index}>
      <IndexTable.Cell>
        <Text variant="bodyMd" fontWeight="semibold" as="span">
          {order.name}
        </Text>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {formatDate(order.createdAt)}
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge status={order.displayFinancialStatus === "PAID" ? "success" : "warning"}>
          {order.displayFinancialStatus}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        <Badge status={order.displayFulfillmentStatus === "FULFILLED" ? "success" : "attention"}>
          {order.displayFulfillmentStatus || "Unfulfilled"}
        </Badge>
      </IndexTable.Cell>
      <IndexTable.Cell>
        {order.totalPriceSet.shopMoney.amount} {order.totalPriceSet.shopMoney.currencyCode}
      </IndexTable.Cell>
    </IndexTable.Row>
  ));

  return (
    <Page
      breadcrumbs={[{ content: "Customers", url: "/customers" }]}
      title={customer.displayName}
      subtitle={customer.email}
      primaryAction={{
        content: "Edit customer",
        onAction: () => navigate(`/customers/${customer.id.split('/').pop()}/edit`),
      }}
      secondaryActions={[
        {
          content: "Delete customer",
          destructive: true,
          onAction: () => console.log("Delete customer"),
        },
      ]}
    >
      <Layout>
        <Layout.Section variant="oneThird">
          <BlockStack gap="400">
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text variant="headingMd" as="h2">
                    Customer
                  </Text>
                  <Badge {...getCustomerStatus()} />
                </InlineStack>
                <Divider />
                <BlockStack gap="200">
                  <InlineStack gap="200">
                    <Thumbnail
                      source={`https://ui-avatars.com/api/?name=${encodeURIComponent(customer.displayName)}&background=random`}
                      alt={customer.displayName}
                      size="medium"
                    />
                    <BlockStack gap="100">
                      <Text variant="bodyLg" fontWeight="semibold" as="p">
                        {customer.displayName}
                      </Text>
                      <Text variant="bodySm" color="subdued" as="p">
                        {customer.email}
                      </Text>
                      {customer.phone && (
                        <Text variant="bodySm" color="subdued" as="p">
                          {customer.phone}
                        </Text>
                      )}
                    </BlockStack>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            <Card>
              <BlockStack gap="400">
                <Text variant="headingMd" as="h2">
                  Overview
                </Text>
                <Divider />
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span">Orders placed</Text>
                    <Text as="span" fontWeight="semibold">{customer.numberOfOrders}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span">Total spent</Text>
                    <Text as="span" fontWeight="semibold">
                      {customer.totalSpentV2.amount} {customer.totalSpentV2.currencyCode}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span">Average order value</Text>
                    <Text as="span" fontWeight="semibold">
                      {customer.averageOrderAmountV2.amount} {customer.averageOrderAmountV2.currencyCode}
                    </Text>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

            {customer.defaultAddress && (
              <Card>
                <BlockStack gap="400">
                  <Text variant="headingMd" as="h2">
                    Default address
                  </Text>
                  <Divider />
                  <BlockStack gap="100">
                    <Text as="p">
                      {customer.defaultAddress.firstName} {customer.defaultAddress.lastName}
                    </Text>
                    {customer.defaultAddress.company && (
                      <Text as="p">{customer.defaultAddress.company}</Text>
                    )}
                    <Text as="p">{customer.defaultAddress.address1}</Text>
                    {customer.defaultAddress.address2 && (
                      <Text as="p">{customer.defaultAddress.address2}</Text>
                    )}
                    <Text as="p">
                      {customer.defaultAddress.city}, {customer.defaultAddress.province} {customer.defaultAddress.zip}
                    </Text>
                    <Text as="p">{customer.defaultAddress.country}</Text>
                    {customer.defaultAddress.phone && (
                      <Text as="p">{customer.defaultAddress.phone}</Text>
                    )}
                  </BlockStack>
                </BlockStack>
              </Card>
            )}
          </BlockStack>
        </Layout.Section>

        <Layout.Section variant="twoThirds">
          <Card>
            <BlockStack gap="400">
              <Text variant="headingMd" as="h2">
                Orders ({customer.numberOfOrders})
              </Text>
              {customer.orders.edges.length === 0 ? (
                <EmptyState
                  heading="No orders yet"
                  image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                >
                  <p>When this customer places an order, it will show up here.</p>
                </EmptyState>
              ) : (
                <IndexTable
                  resourceName={{ singular: "order", plural: "orders" }}
                  itemCount={customer.orders.edges.length}
                  headings={[
                    { title: "Order" },
                    { title: "Date" },
                    { title: "Payment status" },
                    { title: "Fulfillment status" },
                    { title: "Total" },
                  ]}
                  selectable={false}
                >
                  {orderRows}
                </IndexTable>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
