import { EmployeeDto } from "./employee.dto";

export class BranchDto {
  id: string;
  name: string;
  location: string;
  image: string;
  createdBy: string;
  updatedBy: string;
  deletedBy: string;
  employees: EmployeeDto[]; // Use EmployeeDto here
}
