<?php
declare(strict_types=1);

final class CategoryController extends ResourceController
{
    public function __construct(PDO $conn)
    {
        parent::__construct($conn, 'categories', ResourceDefinitions::get('categories'));
    }
}
