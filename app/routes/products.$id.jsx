
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request, params }) => {
  const { admin } = await authenticate.admin(request);
  const productId = `gid://shopify/Product/${params.id}`;

  // Fetch single product using the product API
  const productResponse = await admin.graphql(`
    query getProduct($id: ID!) {
      product(id: $id) {
        id
        title
        handle
        description
        descriptionHtml
        status
        productType
        vendor
        tags
        totalInventory
        createdAt
        updatedAt
        options {
          id
          name
          values
        }
        variants(first: 50) {
          edges {
            node {
              id
              title
              price
              compareAtPrice
              inventoryQuantity
              sku
              availableForSale
              selectedOptions {
                name
                value
              }
              image {
                url
                altText
              }
            }
          }
        }
        featuredImage {
          url
          altText
          width
          height
        }
        images(first: 10) {
          edges {
            node {
              id
              url
              altText
              width
              height
            }
          }
        }
        seo {
          title
          description
        }
      }
    }
  `, {
    variables: { id: productId }
  });

  const productJson = await productResponse.json();

  if (!productJson.data.product) {
    throw new Response("Product not found", { status: 404 });
  }

  return {
    product: productJson.data.product,
  };
};

export default function ProductView() {
  const { product } = useLoaderData();

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getProductStatusColor = (status) => {
    switch (status) {
      case 'ACTIVE':
        return '#008060';
      case 'DRAFT':
        return '#bf9900';
      case 'ARCHIVED':
        return '#d72c0d';
      default:
        return '#6d7175';
    }
  };

  const getProductStatusBg = (status) => {
    switch (status) {
      case 'ACTIVE':
        return '#f0fcf9';
      case 'DRAFT':
        return '#fffbf0';
      case 'ARCHIVED':
        return '#fcf1f1';
      default:
        return '#f6f6f7';
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link 
          to="/products"
          style={{
            padding: '8px 16px',
            backgroundColor: '#f6f6f7',
            border: '1px solid #c9cccf',
            borderRadius: '4px',
            textDecoration: 'none',
            color: '#323232',
            display: 'inline-block',
            marginBottom: '16px'
          }}
        >
          ← Back to Products
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1 style={{ margin: '0', fontSize: '24px', fontWeight: '600' }}>{product.title}</h1>
          <a
            href={`https://admin.shopify.com/store/${product.id.split('/')[4]}/products/${product.id.split('/').pop()}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: '8px 16px',
              backgroundColor: '#008060',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          >
            Edit Product
          </a>
        </div>
      </div>

      {/* Product Overview */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e1e3e5', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: '0', fontSize: '18px', fontWeight: '600' }}>Product Overview</h2>
          <span 
            style={{
              padding: '4px 8px',
              backgroundColor: getProductStatusBg(product.status),
              color: getProductStatusColor(product.status),
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: '500'
            }}
          >
            {product.status.toLowerCase()}
          </span>
        </div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'start' }}>
          {product.featuredImage && (
            <img 
              src={product.featuredImage.url}
              alt={product.featuredImage.altText || product.title}
              style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
            />
          )}
          
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Handle:</strong> {product.handle || '-'}
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Product Type:</strong> {product.productType || '-'}
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Vendor:</strong> {product.vendor || '-'}
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>Total Inventory:</strong> {product.totalInventory || 0}
            </p>
            {product.tags.length > 0 && (
              <p style={{ margin: '0' }}>
                <strong>Tags:</strong> {product.tags.join(', ')}
              </p>
            )}
          </div>
        </div>

        {product.description && (
          <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e1e3e5' }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: '600' }}>Description</h3>
            <p style={{ margin: '0', lineHeight: '1.5' }}>
              {product.description}
            </p>
          </div>
        )}
      </div>

      {/* Variants */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e1e3e5', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Variants ({product.variants.edges.length})
        </h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e1e3e5' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Title</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Price</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Compare At</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>SKU</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Inventory</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: '600' }}>Available</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.edges.map((variant) => {
                const variantNode = variant.node;
                return (
                  <tr key={variantNode.id} style={{ borderBottom: '1px solid #f6f6f7' }}>
                    <td style={{ padding: '12px' }}>
                      {variantNode.title}
                    </td>
                    <td style={{ padding: '12px' }}>
                      ${parseFloat(variantNode.price).toFixed(2)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {variantNode.compareAtPrice ? `$${parseFloat(variantNode.compareAtPrice).toFixed(2)}` : '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {variantNode.sku || '-'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {variantNode.inventoryQuantity}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span 
                        style={{
                          padding: '4px 8px',
                          backgroundColor: variantNode.availableForSale ? '#f0fcf9' : '#fcf1f1',
                          color: variantNode.availableForSale ? '#008060' : '#d72c0d',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}
                      >
                        {variantNode.availableForSale ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product Images */}
      {product.images.edges.length > 0 && (
        <div style={{ backgroundColor: 'white', border: '1px solid #e1e3e5', borderRadius: '8px', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
            Images ({product.images.edges.length})
          </h2>
          
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {product.images.edges.map((image) => (
              <img
                key={image.node.id}
                src={image.node.url}
                alt={image.node.altText || product.title}
                style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px' }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Product Details */}
      <div style={{ backgroundColor: 'white', border: '1px solid #e1e3e5', borderRadius: '8px', padding: '20px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>
          Product Details
        </h2>
        
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Created:</strong> {formatDate(product.createdAt)}
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Updated:</strong> {formatDate(product.updatedAt)}
        </p>
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Product ID:</strong> {product.id}
        </p>
        
        {product.seo.title && (
          <p style={{ margin: '0 0 8px 0' }}>
            <strong>SEO Title:</strong> {product.seo.title}
          </p>
        )}
        
        {product.seo.description && (
          <p style={{ margin: '0' }}>
            <strong>SEO Description:</strong> {product.seo.description}
          </p>
        )}
      </div>
    </div>
  );
}
