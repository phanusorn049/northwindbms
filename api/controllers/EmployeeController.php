<?php
declare(strict_types=1);

final class EmployeeController extends ResourceController
{
    public function __construct(PDO $conn)
    {
        parent::__construct($conn, 'employees', ResourceDefinitions::get('employees'));
    }
}
