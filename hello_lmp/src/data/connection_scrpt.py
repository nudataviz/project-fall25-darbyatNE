import mysql.connector

connection = mysql.connector.connect(
    host='aws-mysql.c61okoae04u4.us-east-1.rds.amazonaws.com',
    port=3306,
    user='bdarby',
    password='Dataviz7250!!',
    database='electric_data'
)
print("Local connection successful!")
