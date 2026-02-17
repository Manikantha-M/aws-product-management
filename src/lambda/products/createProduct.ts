import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import {v4 as uuidv4} from 'uuid';
import { Product, ProductRecord } from "../../types/product";


// Initialize AWS Clients

const dynamoClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dynamoClient);
const s3Client = new S3Client({});
const PRODUCTS_TABLE_NAME = process.env.PRODUCTS_TABLE_NAME;
const PRODUCT_IMAGES_BUCKET_NAME = process.env.PRODUCT_IMAGES_BUCKET_NAME;

export const handler = async (event:APIGatewayProxyEventV2):Promise<APIGatewayProxyResultV2> =>{
    console.log('Event Received', event);
    try {
        if(!event.body){
            return {
                statusCode: 400,
                body: JSON.stringify({message:'Request Body is required'})
            }
        };
        const product: Product = JSON.parse(event.body);
        if(!product.name || typeof product.price != 'number' || !product.description ||!product.imageData) {
            return {
                statusCode: 400,
                body: JSON.stringify({message:'All fields are required: name, description, price and image'})
            }
        };

        const prodcutId = uuidv4();
        const timestamp = new Date().toISOString();

        let imageUrl:string;
        try {
            console.log('starting S3 upload process');
            console.log('Bucket Name:', PRODUCT_IMAGES_BUCKET_NAME);
            // Extract Base64 data
            const base64Data = product.imageData.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            const fileExtension = product.imageData.includes('data:image/jpeg') ? 'jpg' : product.imageData.includes('data:image/png') ? 'png' : 'jpg';
            const s3Key = `products/${prodcutId}.${fileExtension}`;
            console.log('S3 Upload Parameters:', {
                bucket: PRODUCT_IMAGES_BUCKET_NAME,
                key:s3Key,
                contentType: `image:${fileExtension}`,
                bufferSize: imageBuffer.length
            });
            await s3Client.send(new PutObjectCommand({
                Bucket: PRODUCT_IMAGES_BUCKET_NAME,
                Key:s3Key,
                Body:imageBuffer,
                ContentType:`image/${fileExtension}`
            }));
            imageUrl =`https://${PRODUCT_IMAGES_BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;
            console.log('image uploaded to S3 successfully', imageUrl)
        } catch (s3Error: any) {
            console.error('Error uploading image to S3', s3Error);
            console.error('S3 Error details', {
                message: s3Error.message,
                code:s3Error.code,
                statusCode:s3Error.statusCode,
                requestId:s3Error.requestId,
                bucketName:PRODUCT_IMAGES_BUCKET_NAME
            });
            return {
                statusCode:500,
                body:JSON.stringify({message:'Failed to upload image', error:s3Error.message})
            };
        };
        const productRecord:ProductRecord = {
            id: prodcutId,
            name: product.name,
            description: product.description,
            price: product.price,
            imageUrl: imageUrl,
            createdAt: timestamp,
            updatedAt:timestamp
        };
        try {
            await docClient.send(new PutCommand({
                TableName: PRODUCTS_TABLE_NAME,
                Item: productRecord
            }));
            console.log('product stored in DynamoDB', prodcutId);
        } catch (dynamodbError:any) {
            console.log('Error storing product in DynamoDB:', dynamodbError);
            return{
                statusCode: 500,
                body: JSON.stringify({
                    message: 'Failed to store product', error: dynamodbError.message
                })
            }
        };
        return{
            statusCode: 201,
            body: JSON.stringify({
                message:'Product created Successfully',
                product: productRecord
            })
        };

    } catch (error) {
        console.log('Error processing request:', error)
        return {
            statusCode: 500,
            body: JSON.stringify({message:'Internal server error'})
        }
    }
}