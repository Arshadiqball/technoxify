
import { useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  IndexTable,
  Text,
  Badge,
  Button,
  ButtonGroup,
  Tooltip,
  EmptyState,
  Pagination,
  TextField,
  Select,
  Filters,
  BlockStack,
  AppProvider,
} from "@shopify/polaris";
import { authenticate } from "../shopify.server";
import polarisTranslations from "@shopify/polaris/locales/en.json";
import { useState, useCallback } from "react";

export const loader = async ({ request }) => {
  const { admin } = await authenticate.admin(request);
  const url = new URL(request.url);
  const first = parseInt(url.searchParams.get("first") || "50");
  const after = url.searchParams.get("after") || null;
  const query = url.searchParams.get("query") || "";

  try {
    const customersResponse = await admin.graphql(`
      query getCustomers($first: Int!, $after: String, $query: String) {
        customers(first: $first, after: $after, query: $query) {
          edges {
            node {
              id
              displayName
              firstName
              lastName
              email
              phone
              createdAt
              updatedAt
              emailMarketingConsent {
                marketingState
                marketingOptInLevel
              }
              smsMarketingConsent {
                marketingState
                marketingOptInLevel
              }
              state
              tags
              verifiedEmail
              numberOfOrders
              totalSpentV2 {
                amount
                currencyCode
              }
              defaultAddress {
                id
                city
                country
              }
            }
            cursor
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }
    `, {
      variables: {
        first,
        after,
        query: query || null
      }
    });

    const json = await customersResponse.json();
    return {
      customers: json.data.customers.edges,
      pageInfo: json.data.customers.pageInfo,
      query,
      error: null,
      polarisTranslations
    };
  } catch (error) {
    console.error("Customer data access error:", error);
    return {
      customers: [],
      pageInfo: { hasNextPage: false, hasPreviousPage: false },
      query,
      error: "This app needs approval to access customer data. Please request access through your Shopify Partners Dashboard.",
      polarisTranslations
    };
  }
};

export default function Customers() {
  const { customers, pageInfo, query: initialQuery, error, polarisTranslations } = useLoaderData();
  const navigate = useNavigate();
  
  const [query, setQuery] = useState(initialQuery || "");
  const [sortValue, setSortValue] = useState("DATE_MODIFIED_DESC");

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
  }, []);

  const handleQueryClear = useCallback(() => {
    setQuery("");
    navigate("/customers");
  }, [navigate]);

  const handleFiltersSubmit = useCallback(() => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    navigate(`/customers?${params.toString()}`);
  }, [query, navigate]);

  const handleSortChange = useCallback((value) => {
    setSortValue(value);
  }, []);

  const sortOptions = [
    { label: "Date modified (newest first)", value: "DATE_MODIFIED_DESC" },
    { label: "Date modified (oldest first)", value: "DATE_MODIFIED_ASC" },
    { label: "Date created (newest first)", value: "DATE_CREATED_DESC" },
    { label: "Date created (oldest first)", value: "DATE_CREATED_ASC" },
    { label: "Name (A-Z)", value: "NAME_ASC" },
    { label: "Name (Z-A)", value: "NAME_DESC" },
  ];

  const filters = [
    {
      key: "search",
      label: "Search customers",
      filter: (
        <TextField
          value={query}
          onChange={handleQueryChange}
          placeholder="Search by name, email, or phone"
          autoComplete="off"
        />
      ),
      shortcut: true,
    },
  ];

  const appliedFilters = query
    ? [
        {
          key: "search",
          label: `Search: ${query}`,
          onRemove: handleQueryClear,
        },
      ]
    : [];

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getCustomerStatus = (customer) => {
    if (customer.state === "DISABLED") return { status: "critical", children: "Disabled" };
    if (customer.state === "INVITED") return { status: "warning", children: "Invited" };
    if (customer.state === "DECLINED") return { status: "attention", children: "Declined" };
    if (!customer.verifiedEmail) return { status: "warning", children: "Unverified" };
    return { status: "success", children: "Active" };
  };

  const getMarketingStatus = (customer) => {
    const emailConsent = customer.emailMarketingConsent?.marketingState;
    const smsConsent = customer.smsMarketingConsent?.marketingState;
    
    if (emailConsent === "SUBSCRIBED" || smsConsent === "SUBSCRIBED") {
      return { status: "success", children: "Subscribed" };
    }
    if (emailConsent === "UNSUBSCRIBED" || smsConsent === "UNSUBSCRIBED") {
      return { status: "critical", children: "Unsubscribed" };
    }
    return { status: "attention", children: "Not subscribed" };
  };

  const resourceName = {
    singular: "customer",
    plural: "customers",
  };

  const rowMarkup = customers.map(({ node: customer }, index) => {
    const customerId = customer.id.split('/').pop();
    
    return (
      <IndexTable.Row
        id={customer.id}
        key={customer.id}
        position={index}
        onClick={() => navigate(`/customers/${customerId}`)}
      >
        <IndexTable.Cell>
          <Text variant="bodyMd" fontWeight="semibold" as="span">
            {customer.displayName || `${customer.firstName} ${customer.lastName}`.trim() || "Unknown Customer"}
          </Text>
          <br />
          <Text variant="bodySm" color="subdued" as="span">
            {customer.email}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge {...getCustomerStatus(customer)} />
        </IndexTable.Cell>
        <IndexTable.Cell>
          {customer.defaultAddress ? (
            <Text as="span">
              {customer.defaultAddress.city}, {customer.defaultAddress.country}
            </Text>
          ) : (
            <Text as="span" color="subdued">
              No address
            </Text>
          )}
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Badge {...getMarketingStatus(customer)} />
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span">{customer.numberOfOrders}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span">
            {customer.totalSpentV2.amount} {customer.totalSpentV2.currencyCode}
          </Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <Text as="span">{formatDate(customer.createdAt)}</Text>
        </IndexTable.Cell>
        <IndexTable.Cell>
          <ButtonGroup>
            <Tooltip content="View customer">
              <Button
                variant="plain"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/customers/${customerId}`);
                }}
              >
                View
              </Button>
            </Tooltip>
            <Tooltip content="Edit customer">
              <Button
                variant="plain"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/customers/${customerId}/edit`);
                }}
              >
                Edit
              </Button>
            </Tooltip>
          </ButtonGroup>
        </IndexTable.Cell>
      </IndexTable.Row>
    );
  });

  const emptyStateMarkup = error ? (
    <EmptyState
      heading="Customer data access restricted"
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>{error}</p>
      <p>
        To access customer data, you need to request approval through your{" "}
        <a href="https://partners.shopify.com" target="_blank" rel="noopener noreferrer">
          Shopify Partners Dashboard
        </a>.
      </p>
    </EmptyState>
  ) : (
    <EmptyState
      heading="Add your first customer"
      action={{
        content: "Add customer",
        onAction: () => navigate("/customers/new"),
      }}
      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
    >
      <p>
        Customers are the foundation of your business. Add customers to keep
        track of orders, preferences, and contact information.
      </p>
    </EmptyState>
  );

  return (
    <AppProvider i18n={polarisTranslations}>
      <Page
        title="Customers"
        primaryAction={error ? undefined : {
          content: "Add customer",
          onAction: () => navigate("/customers/new"),
        }}
        secondaryActions={[
          {
            content: "Import",
            onAction: () => navigate("/customers/import"),
          },
          {
            content: "Export",
            onAction: () => navigate("/customers/export"),
          },
        ]}
      >
      <Layout>
        <Layout.Section>
          <Card padding="0">
            <BlockStack gap="0">
              <div style={{ padding: "16px" }}>
                <Filters
                  queryValue={query}
                  filters={filters}
                  appliedFilters={appliedFilters}
                  onQueryChange={handleQueryChange}
                  onQueryClear={handleQueryClear}
                  onClearAll={handleQueryClear}
                  onFiltersSubmit={handleFiltersSubmit}
                />
              </div>
              
              {customers.length === 0 ? (
                <div style={{ padding: "16px" }}>
                  {emptyStateMarkup}
                </div>
              ) : (
                <>
                  <div style={{ padding: "0 16px 16px" }}>
                    <Select
                      label="Sort by"
                      options={sortOptions}
                      value={sortValue}
                      onChange={handleSortChange}
                    />
                  </div>
                  
                  <IndexTable
                    resourceName={resourceName}
                    itemCount={customers.length}
                    headings={[
                      { title: "Customer" },
                      { title: "Status" },
                      { title: "Location" },
                      { title: "Marketing" },
                      { title: "Orders" },
                      { title: "Amount spent" },
                      { title: "Date added" },
                      { title: "Actions" },
                    ]}
                    selectable={false}
                  >
                    {rowMarkup}
                  </IndexTable>
                  
                  {(pageInfo.hasNextPage || pageInfo.hasPreviousPage) && (
                    <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
                      <Pagination
                        hasPrevious={pageInfo.hasPreviousPage}
                        onPrevious={() => {
                          const params = new URLSearchParams();
                          if (query) params.set("query", query);
                          params.set("before", pageInfo.startCursor);
                          navigate(`/customers?${params.toString()}`);
                        }}
                        hasNext={pageInfo.hasNextPage}
                        onNext={() => {
                          const params = new URLSearchParams();
                          if (query) params.set("query", query);
                          params.set("after", pageInfo.endCursor);
                          navigate(`/customers?${params.toString()}`);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
    </AppProvider>
  );
}
