<?php
declare(strict_types=1);

final class ProductController extends ResourceController
{
    public function __construct(PDO $conn)
    {
        parent::__construct($conn, 'products', ResourceDefinitions::get('products'));
    }
}
