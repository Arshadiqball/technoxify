

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

  // Fetch products count
  const productsCountResponse = await admin.graphql(`
    query getProductsCount {
      productsCount {
        count
      }
    }
  `);

  // Fetch products using the products API
  const productsResponse = await admin.graphql(`
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            status
            productType
            vendor
            tags
            totalInventory
            createdAt
            updatedAt
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                  inventoryQuantity
                  sku
                }
              }
            }
            featuredImage {
              url
              altText
              width
              height
            }
            images(first: 5) {
              edges {
                node {
                  id
                  url
                  altText
                }
              }
            }
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
        }
      }
    }
  `, {
    variables: { first: 250 }
  });

  const productsJson = await productsResponse.json();
  const productsCountJson = await productsCountResponse.json();

  return {
    products: productsJson.data.products.edges.map(edge => edge.node),
    productsCount: productsCountJson.data.productsCount.count,
    pageInfo: productsJson.data.products.pageInfo,
  };
};

export default function Products() {
  const { products, productsCount, pageInfo } = useLoaderData();

  if (products.length === 0) {
    return (
      <AppProvider i18n={polarisTranslations}>
        <Page 
          title="Products"
          subtitle={`Total: ${productsCount} products`}
          primaryAction={{
            content: "Add product",
            url: "/products/new"
          }}
        >
          <Card>
            <Box padding="1600">
              <Text variant="bodyMd" alignment="center">
                No products found. Create your first product to get started.
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
        title="Products"
        subtitle={`Total: ${productsCount} products`}
        primaryAction={{
          content: "Add product",
          url: "/products/new"
        }}
      >
        <Card>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e1e3e5' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Product</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Type</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Vendor</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Inventory</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Price</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Image</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => {
                  const primaryVariant = product.variants.edges[0]?.node;
                  const totalInventory = product.totalInventory || 0;

                  return (
                    <tr key={product.id} style={{ borderBottom: '1px solid #f6f6f7' }}>
                      <td style={{ padding: '12px' }}>
                        <Link to={`/products/${product.id.split('/').pop()}`} style={{ textDecoration: 'none' }}>
                          <Text variant="bodyMd" fontWeight="bold" as="span" color="interactive">
                            {product.title}
                          </Text>
                          {product.handle && (
                            <Text variant="bodySm" as="p" color="subdued">
                              /{product.handle}
                            </Text>
                          )}
                        </Link>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Badge status={getProductStatusColor(product.status)}>
                          {product.status.toLowerCase()}
                        </Badge>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Text variant="bodyMd" as="span">
                          {product.productType || '-'}
                        </Text>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Text variant="bodyMd" as="span">
                          {product.vendor || '-'}
                        </Text>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Text variant="bodyMd" as="span">
                          {totalInventory > 0 ? `${totalInventory} in stock` : 
                           totalInventory === 0 ? '0 in stock' : '-'}
                        </Text>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <Text variant="bodyMd" as="span">
                          {primaryVariant ? `$${parseFloat(primaryVariant.price).toFixed(2)}` : '-'}
                        </Text>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {product.featuredImage ? (
                          <img 
                            src={product.featuredImage.url} 
                            alt={product.featuredImage.altText || product.title}
                            style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }}
                          />
                        ) : (
                          <Text variant="bodyMd" as="span" color="subdued">No image</Text>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </Page>
    </AppProvider>
  );
}

function getProductStatusColor(status) {
  switch (status) {
    case 'ACTIVE':
      return 'success';
    case 'DRAFT':
      return 'warning';
    case 'ARCHIVED':
      return 'critical';
    default:
      return 'subdued';
  }
}
